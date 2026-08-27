/**
 * React binding for the per-upload caption review panel state.
 *
 * Restores the remembered state whenever the panel mounts for an upload (open,
 * close, reopen, or switching between uploads and returning) and persists every
 * change immediately, so nothing depends on the panel staying mounted.
 */
import { useCallback, useEffect, useState } from "react";
import {
  type CaptionPanelState,
  loadCaptionPanelState,
  saveCaptionPanelState,
} from "@/lib/captionPanelState";

export function useCaptionPanelState(uploadId: string) {
  const [state, setState] = useState<CaptionPanelState>(() => loadCaptionPanelState(uploadId));

  // Switching uploads must swap in that upload's remembered state.
  useEffect(() => {
    setState(loadCaptionPanelState(uploadId));
  }, [uploadId]);

  const update = useCallback(
    (patch: Partial<CaptionPanelState>) => {
      setState(saveCaptionPanelState(uploadId, patch));
    },
    [uploadId],
  );

  return { panelState: state, updatePanelState: update };
}
