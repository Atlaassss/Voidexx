import { Topbar } from "@/components/dash/Topbar";
import { UploadClient } from "./UploadClient";

/**
 * Server shell — renders the Topbar (async server) and delegates the
 * interactive ingest pipeline to the client component.
 */
export default function UploadPage() {
  return (
    <>
      <Topbar
        title="Trade Autopsy"
        sub="Drop a chart screenshot · vision · OCR · structural decode"
      />
      <UploadClient />
    </>
  );
}
