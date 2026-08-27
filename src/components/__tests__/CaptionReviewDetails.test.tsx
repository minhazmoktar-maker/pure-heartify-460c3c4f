/**
 * Regression tests for the Creator Studio caption panels.
 *
 * The panels used to mount for every pending/approved upload, firing a
 * `creator-media-url` call, a caption fetch and an automatic audit entry per
 * row on page load. These tests pin the fixed behaviour:
 *   - nothing fetches until the specific <details> is opened;
 *   - closing it unmounts the panels (aborting/stopping further work);
 *   - no audit entry is written on mount — only on an explicit action.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

const playbackCalls = vi.fn();
const captionCalls = vi.fn();
const auditCalls = vi.fn();

vi.mock("@/hooks/useCreatorStudio", () => ({
  useUploadPlayback: (uploadId: string, context = "watch") => {
    playbackCalls({ uploadId, context });
    return { url: null, error: null, loading: false };
  },
}));

vi.mock("@/hooks/useUploadCaptions", () => ({
  useUploadCaptions: (uploadId: string) => {
    captionCalls({ uploadId });
    return { data: [], isLoading: false, refetch: vi.fn() };
  },
}));

vi.mock("@/lib/captionAudit", () => ({
  logCaptionAudit: (args: unknown) => {
    auditCalls(args);
    return Promise.resolve();
  },
}));

vi.mock("@/components/CaptionAuditTrail", () => ({ default: () => null }));
vi.mock("@/components/CaptionSettingsSheet", () => ({ default: () => null }));

import CaptionReviewDetails from "@/components/CaptionReviewDetails";

function Harness({ uploadId = "upload-1" }: { uploadId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <CaptionReviewDetails
      uploadId={uploadId}
      durationSeconds={120}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

describe("CaptionReviewDetails — lazy mounting", () => {
  beforeEach(() => {
    playbackCalls.mockClear();
    captionCalls.mockClear();
    auditCalls.mockClear();
  });

  it("fetches nothing while the details section is closed", () => {
    render(<Harness />);
    expect(screen.getByText("Review captions before publishing")).toBeInTheDocument();
    expect(playbackCalls).not.toHaveBeenCalled();
    expect(captionCalls).not.toHaveBeenCalled();
    expect(auditCalls).not.toHaveBeenCalled();
  });

  it("mounts the panels — and only then fetches — once opened", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("Review captions before publishing"));

    await waitFor(() => expect(playbackCalls).toHaveBeenCalled());
    expect(screen.getByTestId("caption-review-body-upload-1")).toBeInTheDocument();
    // Playback is requested with the review context used by monitoring.
    expect(playbackCalls.mock.calls[0][0]).toEqual({
      uploadId: "upload-1",
      context: "review_panel",
    });
    expect(captionCalls).toHaveBeenCalled();
  });

  it("does not write a caption audit entry just for opening the panel", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("Review captions before publishing"));
    await waitFor(() => expect(playbackCalls).toHaveBeenCalled());
    expect(auditCalls).not.toHaveBeenCalled();
  });

  it("unmounts the panels again when closed, stopping further work", async () => {
    render(<Harness />);
    const summary = screen.getByText("Review captions before publishing");
    await userEvent.click(summary);
    await waitFor(() => expect(playbackCalls).toHaveBeenCalled());
    const callsWhileOpen = playbackCalls.mock.calls.length;

    await userEvent.click(summary);
    await waitFor(() =>
      expect(screen.queryByTestId("caption-review-body-upload-1")).not.toBeInTheDocument(),
    );
    expect(playbackCalls.mock.calls.length).toBe(callsWhileOpen);
  });
});
