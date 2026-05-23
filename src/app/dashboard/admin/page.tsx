import { Topbar } from "@/components/dash/Topbar";
import { AdminClient } from "./AdminClient";

/**
 * Server shell — renders the Topbar (async server component) and
 * delegates the interactive admin panel to the client component.
 *
 * The Topbar resolves the Clerk session server-side via UserChip, so
 * it cannot live inside a "use client" tree. Same split pattern as
 * /dashboard/upload and /dashboard/billing.
 */
export default function AdminPage() {
  return (
    <>
      <Topbar
        title="Admin Panel"
        sub="User management · audit log · platform stats"
      />
      <AdminClient />
    </>
  );
}
