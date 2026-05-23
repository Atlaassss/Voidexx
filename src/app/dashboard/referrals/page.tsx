import { Topbar } from "@/components/dash/Topbar";
import { ReferralsClient } from "./ReferralsClient";

/**
 * Server shell — renders the Topbar (async server, resolves Clerk
 * session) and delegates the interactive UI to the client component.
 */
export default function ReferralsPage() {
  return (
    <>
      <Topbar
        title="Referrals"
        sub="Pull operators into the void · earn months and tiers"
      />
      <ReferralsClient />
    </>
  );
}
