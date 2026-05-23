import { Topbar } from "@/components/dash/Topbar";
import { CostsClient } from "./CostsClient";

/**
 * Server shell — renders the Topbar (async server component) and
 * delegates the interactive cost dashboard to the client component.
 *
 * Same server/client split as /dashboard/admin and /dashboard/upload.
 */
export default function AICostDashboardPage() {
  return (
    <>
      <Topbar
        title="AI Cost Dashboard"
        sub="Token spend, model breakdown, daily run rate"
      />
      <CostsClient />
    </>
  );
}
