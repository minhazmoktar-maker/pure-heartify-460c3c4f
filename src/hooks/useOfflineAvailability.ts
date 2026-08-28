import { useEffect, useMemo, useState } from "react";
import { listOfflineIds } from "@/lib/audioOffline";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

/**
 * Which of the given track ids will play without a connection.
 *
 * Re-reads IndexedDB whenever a queued download completes so the
 * "Offline available" badges appear as soon as a surah lands.
 */
export function useOfflineAvailability(ids: string[]) {
  const { items } = useOfflineQueue();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const completedCount = items.filter((i) => i.status === "completed").length;

  useEffect(() => {
    let live = true;
    void listOfflineIds().then((all) => { if (live) setSaved(new Set(all)); });
    return () => { live = false; };
  }, [completedCount]);

  const wanted = useMemo(() => new Set(ids), [ids]);
  const availableIds = useMemo(
    () => [...saved].filter((id) => wanted.has(id)),
    [saved, wanted],
  );

  return {
    /** True when this exact track is cached locally. */
    isOffline: (id: string) => saved.has(id),
    availableIds,
    availableCount: availableIds.length,
    total: wanted.size,
  };
}
