/**
 * Collapsible caption review section for one upload (Creator Studio).
 *
 * Both caption panels fetch per upload (`creator-media-url` + caption rows), so
 * they are mounted only while this <details> is open. Closing it unmounts them,
 * which aborts any in-flight request. This gating is the fix for Studio firing a
 * playback-URL request per pending/approved upload on page load.
 */
import CaptionQualityPanel from "@/components/CaptionQualityPanel";
import CaptionReviewPanel from "@/components/CaptionReviewPanel";

interface Props {
  uploadId: string;
  durationSeconds?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Language to focus when a caption-quality notification deep-links here. */
  initialLanguage?: string | null;
}

const CaptionReviewDetails = ({
  uploadId,
  durationSeconds,
  open,
  onOpenChange,
  initialLanguage,
}: Props) => (
  <details
    className="mt-2 rounded-lg border border-border p-2"
    open={open}
    onToggle={(e) => onOpenChange(e.currentTarget.open)}
    data-testid={`caption-review-details-${uploadId}`}
  >
    <summary className="min-h-[32px] cursor-pointer text-xs font-medium text-foreground">
      Review captions before publishing
    </summary>
    {open && (
      <div className="mt-2" data-testid={`caption-review-body-${uploadId}`}>
        <CaptionQualityPanel uploadId={uploadId} durationSeconds={durationSeconds} />
        <CaptionReviewPanel
          uploadId={uploadId}
          durationSeconds={durationSeconds}
          initialLanguage={initialLanguage ?? null}
        />
      </div>
    )}
  </details>
);

export default CaptionReviewDetails;
