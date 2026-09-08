/**
 * Holds the current native push token so sign-out can remove it from the
 * device_tokens table (otherwise the previous user keeps receiving pushes
 * on a shared device).
 */
let currentPushToken: string | null = null;

export const setCurrentPushToken = (token: string | null) => {
  currentPushToken = token;
};

export const getCurrentPushToken = () => currentPushToken;
