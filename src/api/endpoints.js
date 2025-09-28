// api/endpoints.js

export const VITE_CHAT_API_BASE_URL = import.meta.env.VITE_CHAT_API_BASE_URL;
export const WEBSOCKET_URL = `${VITE_CHAT_API_BASE_URL}/ws`;

export const ENDPOINTS = {
  MESSAGES_SYNC: `${VITE_CHAT_API_BASE_URL}/messages/sync`,    // GET missed messages
  CONVO_SYNC: `${VITE_CHAT_API_BASE_URL}/convos/sync`,    // GET missed messages
  SEND_MESSAGE: `${VITE_CHAT_API_BASE_URL}/messages/send`,     // POST new message
  MARK_DELIVERED: `${VITE_CHAT_API_BASE_URL}/messages/delivered`, // POST mark as delivered
};
