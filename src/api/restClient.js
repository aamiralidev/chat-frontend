// api/restClient.js
import { ENDPOINTS } from "./endpoints";
import store from "../state/store"; // <-- import your Redux store

// Helper to fetch with auth header
async function apiFetch(url, options = {}) {
  const state = store.getState();
  const username = state.auth.currentUser?.id; // <-- pull from authSlice

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(username ? { Authorization: `${username}` } : {}), // add header if username exists
  };

  const response = await fetch(url, {
    headers: { ...defaultHeaders, ...options.headers },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// Fetch missed messages since last sync
export async function fetchMissedMessagesSince(lastSync) {
  const url = `${ENDPOINTS.MESSAGES_SYNC}?since=${lastSync}`;
  return apiFetch(url);
}

// Fetch missed conversations since last sync
export async function fetchMissedConvosSince(lastSync) {
  const url = `${ENDPOINTS.CONVO_SYNC}?since=${lastSync}`;
  return apiFetch(url);
}

// Mark a message as delivered
export async function markMessageDelivered(serverId) {
  return apiFetch(ENDPOINTS.MARK_DELIVERED, {
    method: "POST",
    body: JSON.stringify({ messageId: serverId }),
  });
}
