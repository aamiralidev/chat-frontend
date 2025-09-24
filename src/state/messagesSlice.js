// src/state/messagesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as messagesDB from "../data/messagesDB";
import { updateLastMessage } from "./conversationsSlice";

/**
 * Message object shape (client-side)
 * {
 *   id?: number,           // optional DB primary key
 *   local_id: string,      // UUID generated client-side
 *   server_id?: string,    // assigned by server
 *   chat_id: string,
 *   sender_id: string,
 *   sender_username?: string,
 *   content: string,
 *   timestamp: number,     // ms since epoch
 *   status: 'pending'|'sending'|'sent'|'delivered'|'read'|'failed'
 * }
 */

/* -------------------------
   Async thunks
   -------------------------*/

/**
 * Load all cached messages from IndexedDB (used on app bootstrap).
 */
export const loadCachedMessages = createAsyncThunk(
  "messages/loadCachedMessages",
  async () => {
    // returns array of messages
    const messages = await messagesDB.getAllMessages?.() ?? await messagesDB.getAll?.();
    // If your messagesDB exports getAllMessages(), use that; fallback generic names handled.
    return messages;
  }
);

/**
 * Load messages for a particular chat (useful for pagination / opening a chat).
 * Returns { chatId, messages }
 */
export const loadMessagesFromDB = createAsyncThunk(
  "messages/loadMessagesFromDB",
  async (chatId) => {
    const messages = await messagesDB.getMessagesForChat(chatId);
    return { chatId, messages };
  }
);

/**
 * Save a message to IndexedDB. Returns the saved message.
 * This is used when composing/sending a new message (persist before send).
 */
export const saveMessageToDB = createAsyncThunk(
  "messages/saveMessageToDB",
  async (message) => {
    await messagesDB.saveMessage(message);
    return message;
  }
);

/**
 * Fetch missed messages from server since lastSyncTimestamp (REST fallback).
 * payload: { lastSyncTimestamp } (number)
 * Returns array of server messages.
 */
export const syncWithServer = createAsyncThunk(
  "messages/syncWithServer",
  async ({ lastSyncTimestamp }) => {
    // fetchMissedMessages should internally use lastSyncTimestamp or your API contract
    // const messages = await fetchMissedMessages(lastSyncTimestamp);
    const messages = []
    return messages || [];
  }
);

/* -------------------------
   Helper: upsert into state
   -------------------------*/
function upsertMessageIntoState(state, message) {
  const chatId = message.chat_id;
  if (!chatId) return;

  if (!state.byChatId[chatId]) state.byChatId[chatId] = [];

  const list = state.byChatId[chatId];

  // Try to find existing by server_id first, then local_id
  const existingIndex = list.findIndex(
    (m) =>
      (m.server_id && message.server_id && m.server_id === message.server_id) ||
      (m.local_id && message.local_id && m.local_id === message.local_id)
  );

  if (existingIndex >= 0) {
    // Merge/replace - prefer server fields when present, keep timestamp ordering intact
    const existing = list[existingIndex];
    list[existingIndex] = { ...existing, ...message };
  } else {
    // Insert in sorted order (by timestamp ascending). Keep arrays reasonably ordered.
    // Simple push then sort for clarity; for large lists optimize (binary insert).
    list.push(message);
    list.sort((a, b) => a.timestamp - b.timestamp);
  }
}

export const sendMessage = createAsyncThunk('messages/sendMessage', async ({ chatId, message }, { dispatch }) => {
  dispatch(addMessage({ chatId, message }));
  await dispatch(saveMessageToDB(message));
  dispatch(updateLastMessage({ chatId, message }));
  // middleware will handle sending
  return message;
})


/* -------------------------
   Slice
   -------------------------*/
const initialState = {
  byChatId: {},           // { [chatId]: Message[] }
  loading: false,
  error: null,
  lastSyncTimestamp: null // updated by syncWithServer or metaDB elsewhere
};

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    /**
     * Add a message into Redux state (used by UI instantly when sending,
     * and also by websocket incoming message handlers).
     *
     * payload: { chatId, message }
     */
    addMessage: (state, action) => {
      const { chatId, message } = action.payload;
      upsertMessageIntoState(state, message);
      state.error = null;
    },

    /**
     * Update message status (e.g., pending -> sent) and optionally attach server_id.
     *
     * payload: { chatId, localId, status, serverId? }
     */
    updateMessageStatus: (state, action) => {
      const { chatId, localId, status, serverId } = action.payload;
      const list = state.byChatId[chatId] || [];
      const msg = list.find(
        (m) => (m.local_id && m.local_id === localId) || (serverId && m.server_id === serverId)
      );
      if (msg) {
        msg.status = status;
        if (serverId) msg.server_id = serverId;
      }
    },

    /**
     * Replace messages for a chat (used by pagination or manual refresh).
     * payload: { chatId, messages }
     */
    setMessagesForChat: (state, action) => {
      const { chatId, messages } = action.payload;
      state.byChatId[chatId] = messages.slice().sort((a, b) => a.timestamp - b.timestamp);
    },

    /**
     * Optional: remove a message (by local_id or server_id).
     * payload: { chatId, localId?, serverId? }
     */
    removeMessage: (state, action) => {
      const { chatId, localId, serverId } = action.payload;
      if (!state.byChatId[chatId]) return;
      state.byChatId[chatId] = state.byChatId[chatId].filter(
        (m) => !(m.local_id === localId || (serverId && m.server_id === serverId))
      );
    }
  },

  extraReducers: (builder) => {
    /* loadCachedMessages (all DB messages) */
    builder.addCase(loadCachedMessages.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loadCachedMessages.fulfilled, (state, action) => {
      state.loading = false;
      const messages = action.payload || [];
      // Upsert all messages into byChatId
      messages.forEach((m) => upsertMessageIntoState(state, m));
    });
    builder.addCase(loadCachedMessages.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error?.message || "Failed to load cached messages";
    });

    /* loadMessagesFromDB (single chat) */
    builder.addCase(loadMessagesFromDB.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loadMessagesFromDB.fulfilled, (state, action) => {
      state.loading = false;
      const { chatId, messages } = action.payload;
      state.byChatId[chatId] = (messages || []).slice().sort((a, b) => a.timestamp - b.timestamp);
    });
    builder.addCase(loadMessagesFromDB.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error?.message || "Failed to load messages for chat";
    });

    /* saveMessageToDB (persist new message) */
    builder.addCase(saveMessageToDB.fulfilled, (state, action) => {
      // The message was already added to the Redux state by addMessage (optimistic).
      // Nothing else required here. If DB returned a generated id we could attach it.
    });
    builder.addCase(saveMessageToDB.rejected, (state, action) => {
      state.error = action.error?.message || "Failed to save message to DB";
    });

    /* syncWithServer (pull missed messages) */
    builder.addCase(syncWithServer.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(syncWithServer.fulfilled, (state, action) => {
      state.loading = false;
      const serverMessages = action.payload || [];
      serverMessages.forEach((m) => upsertMessageIntoState(state, m));
      state.lastSyncTimestamp = Date.now();
    });
    builder.addCase(syncWithServer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error?.message || "Sync with server failed";
    });
  }
});

export const {
  addMessage,
  updateMessageStatus,
  setMessagesForChat,
  removeMessage
} = messagesSlice.actions;

export default messagesSlice.reducer;
