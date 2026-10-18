/** Cross-tab logout signal. Sessions are httpOnly, so tabs can't observe
 * cookie clearing via onAuthStateChange; they listen here instead. */
export const AUTH_SYNC_CHANNEL = "voiceflow-auth";
export const AUTH_SYNC_STORAGE_KEY = "voiceflow-auth-event";
export const FORCE_LOGOUT_KEY = "voiceflow-force-logout";

export type AuthSyncMessage = {
  event: "SIGNED_OUT";
  at: number;
};

/** Tell every other open tab the user signed out. Safe to call from the browser only. */
export function broadcastSignedOut() {
  const message: AuthSyncMessage = { event: "SIGNED_OUT", at: Date.now() };
  try {
    localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(message));
    // If the sign-out request never reached the server (offline), finish it on
    // the next online navigation via AuthSessionSync.
    localStorage.setItem(FORCE_LOGOUT_KEY, "1");
  } catch {
    // private mode / disabled storage
  }
  try {
    const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    // BroadcastChannel unsupported
  }
}

export function clearForceLogoutFlag() {
  try {
    localStorage.removeItem(FORCE_LOGOUT_KEY);
  } catch {
    // ignore
  }
}

export function hasForceLogoutFlag(): boolean {
  try {
    return localStorage.getItem(FORCE_LOGOUT_KEY) === "1";
  } catch {
    return false;
  }
}
