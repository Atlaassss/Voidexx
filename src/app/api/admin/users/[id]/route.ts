import { NextResponse } from "next/server";
import { requireAdmin, auditLog, getRequestIp } from "@/lib/admin";
import { asResponse } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Body schema for the admin PATCH endpoint.
 *
 * Phase 8 added:
 *   - bonusAutopsies     absolute set, e.g. 0..50
 *   - grantBonus         delta — preferred over absolute. +5 / -3 etc.
 *   - suspend            { reason } — soft-suspends the account.
 *                        Use { suspend: null } to lift the suspension.
 *
 * The grant-vs-set split exists because deltas are easier to reason
 * about in support workflows ("give them 5 more") and they audit-log
 * cleanly as "+5" rather than "12 → 17 → 22" across multiple grants.
 */
const PatchUserSchema = z
  .object({
    plan: z.enum(["RECON", "OPERATOR", "DESK"]).optional(),
    role: z.enum(["USER", "ADMIN", "SUPPORT"]).optional(),
    freeUsageMonth: z.number().int().min(0).optional(),
    bonusAutopsies: z.number().int().min(0).max(500).optional(),
    grantBonus: z.number().int().min(-100).max(100).optional(),
    suspend: z
      .union([z.object({ reason: z.string().max(500) }), z.null()])
      .optional(),
  })
  .strict();

/**
 * GET /api/admin/users/[id]
 *
 * Detail view for the admin user-detail page. Returns the user plus
 * recent payments / autopsies / audit-log entries in one round-trip
 * so the page can server-render with no client-side waterfalls.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const db = tryGetDb();
  if (!db || admin.isDemo) {
    return NextResponse.json({
      demo: true,
      user: demoUser(id),
      payments: demoPayments(),
      autopsies: demoAutopsies(),
      audit: demoAudit(id),
    });
  }

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      plan: true,
      planRenewsAt: true,
      subscriptionStatus: true,
      freeUsageMonth: true,
      bonusAutopsies: true,
      suspendedAt: true,
      suspendedReason: true,
      stripeCustomerId: true,
      paymongoIntentId: true,
      referralCode: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const [payments, autopsies, audit] = await Promise.all([
    db.payment.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        provider: true,
        providerRef: true,
        amountCents: true,
        currency: true,
        status: true,
        description: true,
        createdAt: true,
      },
    }),
    db.autopsy.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        score: true,
        verdict: true,
        flags: true,
        createdAt: true,
        trade: { select: { symbol: true, timeframe: true, direction: true } },
      },
    }),
    db.adminAuditLog.findMany({
      where: { OR: [{ targetType: "User", targetId: id }, { actorId: id }] },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        actorId: true,
        action: true,
        meta: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    user: {
      ...user,
      planRenewsAt: user.planRenewsAt?.toISOString() ?? null,
      suspendedAt: user.suspendedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    payments: payments.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
    autopsies: autopsies.map((a) => ({
      ...a,
      flags: a.flags as string[],
      createdAt: a.createdAt.toISOString(),
    })),
    audit: audit.map((a) => ({
      ...a,
      meta: a.meta ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

/**
 * PATCH /api/admin/users/[id]
 *
 * Admin-only update. All changes audit-logged with before/after.
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
    select: {
      plan: true,
      role: true,
      freeUsageMonth: true,
      bonusAutopsies: true,
      suspendedAt: true,
      suspendedReason: true,
    },
  });
  if (!before) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  // Build update payload.
  const data: Record<string, unknown> = {};
  if (parsed.data.plan !== undefined) data.plan = parsed.data.plan;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.freeUsageMonth !== undefined) {
    data.freeUsageMonth = parsed.data.freeUsageMonth;
  }
  if (parsed.data.bonusAutopsies !== undefined) {
    data.bonusAutopsies = parsed.data.bonusAutopsies;
  }
  if (parsed.data.grantBonus !== undefined) {
    // Atomic relative grant — bounded at 0 floor.
    data.bonusAutopsies = Math.max(
      0,
      before.bonusAutopsies + parsed.data.grantBonus,
    );
  }
  if (parsed.data.suspend !== undefined) {
    if (parsed.data.suspend === null) {
      data.suspendedAt = null;
      data.suspendedReason = null;
    } else {
      data.suspendedAt = new Date();
      data.suspendedReason = parsed.data.suspend.reason;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, message: "No changes." });
  }

  const after = await db.user.update({
    where: { id: targetUserId },
    data,
    select: {
      id: true,
      plan: true,
      role: true,
      freeUsageMonth: true,
      bonusAutopsies: true,
      suspendedAt: true,
      suspendedReason: true,
    },
  });

  // Choose the right action label for audit clarity.
  const action =
    parsed.data.suspend === null
      ? "user.unsuspended"
      : parsed.data.suspend !== undefined
        ? "user.suspended"
        : parsed.data.grantBonus !== undefined
          ? "user.bonus_granted"
          : "user.updated";

  await auditLog({
    actorId: admin.id,
    action,
    targetType: "User",
    targetId: targetUserId,
    meta: {
      before,
      after: {
        plan: after.plan,
        role: after.role,
        freeUsageMonth: after.freeUsageMonth,
        bonusAutopsies: after.bonusAutopsies,
        suspendedAt: after.suspendedAt?.toISOString() ?? null,
      },
      grantDelta: parsed.data.grantBonus,
      suspendReason: parsed.data.suspend && parsed.data.suspend !== null ? parsed.data.suspend.reason : undefined,
    },
    ip: getRequestIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, user: { ...after, suspendedAt: after.suspendedAt?.toISOString() ?? null } });
}

// ---------------------------------------------------------------------------
// Demo-mode mocks — keep the admin UI clickable without a DB.
// ---------------------------------------------------------------------------

function demoUser(id: string) {
  return {
    id,
    email: `${id}@voidexx.demo`,
    username: id.slice(0, 8),
    displayName: "Demo User",
    role: "USER",
    plan: "RECON",
    planRenewsAt: null,
    subscriptionStatus: null,
    freeUsageMonth: 3,
    bonusAutopsies: 0,
    suspendedAt: null,
    suspendedReason: null,
    stripeCustomerId: null,
    paymongoIntentId: null,
    referralCode: "DEMO" + id.slice(0, 4).toUpperCase(),
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function demoPayments() {
  return [
    {
      id: "pay_demo_1",
      provider: "STRIPE",
      providerRef: "ch_demo_1",
      amountCents: 2400,
      currency: "USD",
      status: "PAID",
      description: "Operator · monthly",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "pay_demo_2",
      provider: "PAYMONGO",
      providerRef: "pm_demo_1",
      amountCents: 134400,
      currency: "PHP",
      status: "PAID",
      description: "PayMongo · GCash",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function demoAutopsies() {
  return [
    {
      id: "ap_demo_1",
      score: 38,
      verdict: "Liquidity-trap entry above session high.",
      flags: ["revenge", "premium_short", "liquidity_grab"],
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      trade: { symbol: "BTCUSDT", timeframe: "1H", direction: "SHORT" },
    },
    {
      id: "ap_demo_2",
      score: 91,
      verdict: "Clean OB retest after London-low sweep.",
      flags: ["patient_entry", "confluence"],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      trade: { symbol: "EURUSD", timeframe: "15M", direction: "LONG" },
    },
  ];
}

function demoAudit(targetId: string) {
  return [
    {
      id: "al_demo_1",
      actorId: "admin_demo",
      action: "user.bonus_granted",
      meta: { grantDelta: 5, before: { bonusAutopsies: 0 }, after: { bonusAutopsies: 5 } },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "al_demo_2",
      actorId: "admin_demo",
      action: "user.updated",
      meta: { before: { plan: "RECON" }, after: { plan: "OPERATOR" } },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "al_demo_3",
      actorId: targetId,
      action: "self.signin",
      meta: null,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  ];
}
