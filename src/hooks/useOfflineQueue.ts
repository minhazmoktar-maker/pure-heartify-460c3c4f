import { useEffect, useState } from "react";
import {
  subscribeQueue,
  getQueue,
  enqueueDownload,
  retryDownload,
  cancelDownload,
  clearQueueItem,
  clearFinished,
  cancelAll,
  QUEUE_ACTIVE_STATUSES,
  type QueueItem,
} from "@/lib/offlineQueue";
import {
  getOfflineSettings,
  setOfflineSettings,
  resetOfflineSettings,
  subscribeOfflineSettings,
  detectPreset,
  OFFLINE_PRESETS,
  type OfflineDownloadSettings,
  type OfflinePresetName,
} from "@/lib/offlineSettings";

/** Live view of the offline download queue. */
export function useOfflineQueue() {
  const [items, setItems] = useState<QueueItem[]>(() => getQueue());
  useEffect(() => subscribeQueue(setItems), []);

  const active = items.filter((i) => QUEUE_ACTIVE_STATUSES.includes(i.status));
  const finished = items.filter((i) => !QUEUE_ACTIVE_STATUSES.includes(i.status));

  return {
    items,
    active,
    finished,
    enqueue: enqueueDownload,
    retry: retryDownload,
    cancel: cancelDownload,
    remove: clearQueueItem,
    clearFinished,
    cancelAll,
  };
}

/** Live view of the user's retry/backoff preferences. */
export function useOfflineSettings() {
  const [settings, setSettings] = useState<OfflineDownloadSettings>(() => getOfflineSettings());
  useEffect(() => subscribeOfflineSettings(setSettings), []);

  return {
    settings,
    preset: detectPreset(settings),
    update: (patch: Partial<OfflineDownloadSettings>) => setOfflineSettings(patch),
    applyPreset: (name: OfflinePresetName) => setOfflineSettings(OFFLINE_PRESETS[name]),
    reset: resetOfflineSettings,
  };
}
