/**
 * Resumable chunked uploads to Cloud storage (TUS protocol).
 *
 * Large videos on mobile networks routinely lose the connection. Each upload
 * URL is persisted locally against a fingerprint of (path + size + mtime), so
 * a retry — even after a full app restart — continues from the last completed
 * 6MB chunk instead of re-sending the whole file.
 */
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const CHUNK_SIZE = 6 * 1024 * 1024; // Storage requires exactly 6MB chunks.
const RESUME_PREFIX = "heartify.resumable.";

export interface ResumableOptions {
  bucket: string;
  objectPath: string;
  file: File;
  contentType?: string;
  /** 0-1 fraction of this file's bytes transferred. */
  onProgress?: (fraction: number, uploadedBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
}

export interface ResumableResult {
  ok: boolean;
  resumed: boolean;
  error?: string;
}

function fingerprint(bucket: string, objectPath: string, file: File) {
  return `${RESUME_PREFIX}${bucket}/${objectPath}/${file.size}/${file.lastModified}`;
}

function readStoredUrl(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeUrl(key: string, url: string | null) {
  try {
    if (url) window.localStorage.setItem(key, url);
    else window.localStorage.removeItem(key);
  } catch {
    /* private mode — resume simply won't survive a reload */
  }
}

/** Clears any saved resume state for a file (e.g. after the user cancels). */
export function clearResumeState(bucket: string, objectPath: string, file: File) {
  storeUrl(fingerprint(bucket, objectPath, file), null);
}

export async function uploadResumable(opts: ResumableOptions): Promise<ResumableResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, resumed: false, error: "You need to be signed in to upload." };

  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`;
  const key = fingerprint(opts.bucket, opts.objectPath, opts.file);
  const existingUrl = readStoredUrl(key);

  return new Promise<ResumableResult>((resolve) => {
    let settled = false;
    const finish = (result: ResumableResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const upload = new tus.Upload(opts.file, {
      endpoint,
      uploadUrl: existingUrl ?? undefined,
      retryDelays: [0, 1000, 3000, 6000, 12000, 20000],
      chunkSize: CHUNK_SIZE,
      removeFingerprintOnSuccess: true,
      uploadDataDuringCreation: false,
      headers: {
        authorization: `Bearer ${token}`,
        "x-upsert": "true",
      },
      metadata: {
        bucketName: opts.bucket,
        objectName: opts.objectPath,
        contentType: opts.contentType || opts.file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onShouldRetry: (err) => {
        const status = (err as { originalResponse?: { getStatus?: () => number } })
          ?.originalResponse?.getStatus?.();
        // Never retry auth/permission/validation failures — only transport ones.
        if (status && [400, 401, 403, 404, 409, 413, 422].includes(status)) return false;
        return true;
      },
      onAfterResponse: (_req, res) => {
        const location = res.getHeader?.("Location");
        if (location) storeUrl(key, location);
      },
      onProgress: (sent, total) => {
        opts.onProgress?.(total > 0 ? sent / total : 0, sent, total);
      },
      onSuccess: () => {
        storeUrl(key, null);
        finish({ ok: true, resumed: Boolean(existingUrl) });
      },
      onError: (error) => {
        const status = (error as { originalResponse?: { getStatus?: () => number } })
          ?.originalResponse?.getStatus?.();
        // A stale resume URL (expired or already finalised) must not wedge the
        // creator forever — drop it so the next attempt starts fresh.
        if (status && [404, 409, 410].includes(status)) storeUrl(key, null);
        finish({
          ok: false,
          resumed: Boolean(existingUrl),
          error:
            status === 403
              ? "Storage rejected this upload. Please sign in again."
              : "Connection interrupted. Tap retry — the upload continues where it stopped.",
        });
      },
    });

    if (opts.signal) {
      opts.signal.addEventListener(
        "abort",
        () => {
          void upload.abort();
          finish({ ok: false, resumed: Boolean(existingUrl), error: "Upload paused." });
        },
        { once: true },
      );
    }

    if (existingUrl) {
      // Ask the server how many bytes it already holds before continuing.
      upload.findPreviousUploads().then((previous) => {
        if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      }).catch(() => upload.start());
    } else {
      upload.start();
    }
  });
}
