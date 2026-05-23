import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { asResponse } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/admin/users?page=1&limit=20&search=...
 *
 * Lists users with pagination. Admin-only.
 * Demo mode: returns mock user list.
 */
export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const search = url.searchParams.get("search")?.trim() ?? "";

  const db = tryGetDb();
  if (!db || admin.isDemo) {
    return NextResponse.json({
      users: DEMO_USERS,
      total: DEMO_USERS.length,
      page,
      limit,
      demo: true,
    });
  }

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { username: { contains: search, mode: "insensitive" as const } },
          { displayName: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        plan: true,
        subscriptionStatus: true,
        freeUsageMonth: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit });
}

const DEMO_USERS = [
  {
    id: "demo_user_kx",
    email: "kx@voidexx.io",
    username: "kx.haunter",
    displayName: "kx.haunter",
    role: "ADMIN",
    plan: "DESK",
    subscriptionStatus: "active",
    freeUsageMonth: 0,
    createdAt: "2025-03-01T00:00:00.000Z",
  },
  {
    id: "demo_user_2",
    email: "trader@voidexx.io",
    username: "ghost.candle",
    displayName: "Ghost Candle",
    role: "USER",
    plan: "OPERATOR",
    subscriptionStatus: "active",
    freeUsageMonth: 3,
    createdAt: "2025-04-15T00:00:00.000Z",
  },
  {
    id: "demo_user_3",
    email: "newbie@voidexx.io",
    username: "paper.hands",
    displayName: "Paper Hands",
    role: "USER",
    plan: "RECON",
    subscriptionStatus: null,
    freeUsageMonth: 5,
    createdAt: "2025-05-10T00:00:00.000Z",
  },
];
