// api/endpoints.js

export const API_BASE_URL = "https://api.yourchatapp.com";

export const ENDPOINTS = {
  MESSAGES_SYNC: `${API_BASE_URL}/messages/sync`,    // GET missed messages
  CONVO_SYNC: `${API_BASE_URL}/convos/sync`,    // GET missed messages
  SEND_MESSAGE: `${API_BASE_URL}/messages/send`,     // POST new message
  MARK_DELIVERED: `${API_BASE_URL}/messages/delivered`, // POST mark as delivered
};
