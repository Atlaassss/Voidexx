import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { asResponse } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/admin/audit?page=1&limit=50&action=...
 *
 * Lists audit log entries with pagination. Admin-only.
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
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const actionFilter = url.searchParams.get("action")?.trim() ?? "";

  const db = tryGetDb();
  if (!db || admin.isDemo) {
    return NextResponse.json({
      logs: DEMO_LOGS,
      total: DEMO_LOGS.length,
      page,
      limit,
      demo: true,
    });
  }

  const where = actionFilter ? { action: { contains: actionFilter } } : {};

  const [logs, total] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.adminAuditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}

const DEMO_LOGS = [
  {
    id: "audit_demo_1",
    actorId: "demo_user_kx",
    action: "user.updated",
    targetType: "User",
    targetId: "demo_user_3",
    meta: { before: { plan: "RECON" }, after: { plan: "OPERATOR" } },
    ip: "127.0.0.1",
    userAgent: "Mozilla/5.0",
    createdAt: "2025-05-20T14:32:00.000Z",
  },
  {
    id: "audit_demo_2",
    actorId: "demo_user_kx",
    action: "user.role_changed",
    targetType: "User",
    targetId: "demo_user_2",
    meta: { before: { role: "USER" }, after: { role: "SUPPORT" } },
    ip: "127.0.0.1",
    userAgent: "Mozilla/5.0",
    createdAt: "2025-05-19T10:00:00.000Z",
  },
];
