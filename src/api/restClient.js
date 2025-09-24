// api/restClient.js
import { ENDPOINTS } from "./endpoints";

async function apiFetch(url, options = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
  };
  const response = await fetch(url, {
    headers: defaultHeaders,
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
  const data = await apiFetch(url);

  return data.messages;
}

// Fetch missed messages since last sync
export async function fetchMissedConvosSince(lastSync) {
  const url = `${ENDPOINTS.CONVO_SYNC}?since=${lastSync}`;
  const data = await apiFetch(url);

  return data.messages;
}

// Mark a message as delivered
export async function markMessageDelivered(serverId) {
  return apiFetch(ENDPOINTS.MARK_DELIVERED, {
    method: "POST",
    body: JSON.stringify({ messageId: serverId }),
  });
}
