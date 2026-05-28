import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireUser, asResponse } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * POST /api/autopsy/:id/share
 *
 * Toggle a public share link for an autopsy.
 *
 * Body: { enabled: boolean }
 *
 *   enabled=true  → mints a fresh 12-char url-safe shareId and flips
 *                   shareEnabled. Returns { shareId, shareUrl }.
 *                   If the autopsy already has a shareId we keep it
 *                   (so re-enabling resurrects the same link).
 *
 *   enabled=false → flips shareEnabled to false. We DON'T null out
 *                   shareId — that way if the user toggles share back
 *                   on later, all the people they sent it to get the
 *                   same URL back. To rotate the URL (fresh token),
 *                   call rotate=true.
 *
 *   rotate=true   → forces a new shareId regardless of current state.
 *                   Implies enabled=true. Use case: the URL leaked
 *                   somewhere it shouldn't have.
 *
 * Demo mode: returns 503 with a helpful message — sharing requires a
 * DB to look up the shareId on the public side.
 */
const Body = z
  .object({
    enabled: z.boolean(),
    rotate: z.boolean().optional(),
  })
  .strict();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { enabled, rotate } = parsed.data;

  const db = tryGetDb();
  if (!db) {
    return NextResponse.json(
      {
        error: "share_unavailable",
        message:
          "Share links require a database. Set DATABASE_URL to enable.",
        demo: true,
      },
      { status: 503 },
    );
  }

  // Ownership check — never trust the client.
  const row = await db.autopsy.findUnique({
    where: { id },
    select: { userId: true, shareId: true },
  });
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let shareId = row.shareId;
  if (enabled) {
    if (!shareId || rotate) {
      shareId = await mintShareId(db);
    }
    await db.autopsy.update({
      where: { id },
      data: { shareEnabled: true, shareId },
    });
  } else {
    await db.autopsy.update({
      where: { id },
      data: { shareEnabled: false },
    });
  }

  const shareUrl = enabled && shareId ? `${env.app.url}/share/${shareId}` : null;
  return NextResponse.json({
    enabled,
    shareId: enabled ? shareId : null,
    shareUrl,
  });
}

/**
 * Generate a url-safe 12-char token. Retries on collision (vanishingly
 * rare with 12 chars of base62 = ~71 bits of entropy, but defensive).
 */
async function mintShareId(
  db: NonNullable<ReturnType<typeof tryGetDb>>,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = base62(12);
    const taken = await db.autopsy.findUnique({
      where: { shareId: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  // Fallback — practically unreachable. 16 chars = ~95 bits of entropy.
  return base62(16);
}

/** url-safe base62 of N characters from N*6 bits of entropy. */
function base62(len: number): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}
