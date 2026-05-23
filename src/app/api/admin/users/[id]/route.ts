import { NextResponse } from "next/server";
import { requireAdmin, auditLog, getRequestIp } from "@/lib/admin";
import { asResponse } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const PatchUserSchema = z.object({
  plan: z.enum(["RECON", "OPERATOR", "DESK"]).optional(),
  role: z.enum(["USER", "ADMIN", "SUPPORT"]).optional(),
  freeUsageMonth: z.number().int().min(0).optional(),
});

/**
 * PATCH /api/admin/users/[id]
 *
 * Update a user's plan, role, or usage counter. Admin-only.
 * All changes are audit-logged.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Forbidden", { status: 403 });
  }

  const { id: targetUserId } = await params;

  const json = await req.json().catch(() => ({}));
  const parsed = PatchUserSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const db = tryGetDb();
  if (!db || admin.isDemo) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "Would update user in production.",
    });
  }

  const before = await db.user.findUnique({
    where: { id: targetUserId },
    select: { plan: true, role: true, freeUsageMonth: true },
  });

  if (!before) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.plan !== undefined) data.plan = parsed.data.plan;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.freeUsageMonth !== undefined) data.freeUsageMonth = parsed.data.freeUsageMonth;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, message: "No changes." });
  }

  const after = await db.user.update({
    where: { id: targetUserId },
    data,
    select: { id: true, plan: true, role: true, freeUsageMonth: true },
  });

  await auditLog({
    actorId: admin.id,
    action: "user.updated",
    targetType: "User",
    targetId: targetUserId,
    meta: { before, after: { plan: after.plan, role: after.role, freeUsageMonth: after.freeUsageMonth } },
    ip: getRequestIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, user: after });
}
