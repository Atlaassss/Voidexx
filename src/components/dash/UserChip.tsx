import { env } from "@/lib/env";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";

/**
 * Right-side chip in the dashboard topbar.
 * - Clerk on  → mounts <UserButton/> with our themed appearance
 * - Demo mode → shows a compact "demo" chip linking to sign-in
 */
export async function UserChip() {
  if (env.clerk.enabled) {
    const { UserButton } = await import("@clerk/nextjs");
    return (
      <div className="flex items-center gap-2">
        <UserButton
          appearance={{
            variables: {
              colorPrimary: "#00ff9d",
              colorBackground: "#0a0a0b",
              colorText: "#f4f4f8",
              colorTextSecondary: "#8a8a9e",
              borderRadius: "0",
              fontFamily: "var(--font-body)",
            },
            elements: {
              avatarBox: "h-9 w-9 border border-void-300/70 bg-signal-violet/[0.08]",
              userButtonTrigger: "outline-none focus:outline-none",
            },
          }}
        />
      </div>
    );
  }

  const u = await getSessionUser();
  return (
    <Link
      href="/sign-in"
      className="flex items-center gap-2"
      title="Demo session — click to view sign-in"
    >
      <span className="grid h-9 w-9 place-items-center border border-void-300/70 bg-signal-violet/[0.08] font-mono text-xs uppercase text-signal-violet">
        {u?.username?.slice(0, 2).toUpperCase() ?? "KX"}
      </span>
    </Link>
  );
}
