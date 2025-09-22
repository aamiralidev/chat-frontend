import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../data/db';

// ---------------------------------------
// Async Thunks
// ---------------------------------------

// Load *all* cached messages on startup
export const loadCachedMessages = createAsyncThunk(
  'messages/loadCached',
  async () => {
    const messages = await db.messages.toArray();
    return messages;
  }
);

// Load messages for a specific chat (used for pagination or focused load)
export const loadMessagesFromDB = createAsyncThunk(
  'messages/loadFromDB',
  async (chatId) => {
    const messages = await db.messages
      .where('chat_id')
      .equals(chatId)
      .sortBy('timestamp');

    return { chatId, messages };
  }
);

// Save a new message to IndexedDB
export const saveMessageToDB = createAsyncThunk(
  'messages/saveToDB',
  async (message) => {
    await db.messages.add(message);
    return message;
  }
);

// Fetch missed messages from server
export const syncWithServer = createAsyncThunk(
  'messages/syncWithServer',
  async ({ lastSyncTimestamp }) => {
    const response = await fetch(`/api/messages/sync?since=${lastSyncTimestamp}`);
    const data = await response.json();
    return data.messages;
  }
);

// ---------------------------------------
// Slice
// ---------------------------------------

const initialState = {
  entities: {},           // { chatId: [messages...] }
  loading: false,
  error: null,
  lastSyncTimestamp: null
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      const { chatId, message } = action.payload;
      if (!state.entities[chatId]) state.entities[chatId] = [];
      state.entities[chatId].push(message);
    },

    updateMessageStatus: (state, action) => {
      const { chatId, localId, status, serverId } = action.payload;
      const messages = state.entities[chatId] || [];
      const msg = messages.find(
        (m) => m.local_id === localId || m.server_id === serverId
      );
      if (msg) {
        msg.status = status;
        if (serverId) msg.server_id = serverId;
      }
    },

    setMessagesForChat: (state, action) => {
      const { chatId, messages } = action.payload;
      state.entities[chatId] = messages;
    }
  },

  extraReducers: (builder) => {
    builder
      // Handle initial offline cached load
      .addCase(loadCachedMessages.fulfilled, (state, action) => {
        action.payload.forEach(msg => {
          if (!state.entities[msg.chat_id]) {
            state.entities[msg.chat_id] = [];
          }
          state.entities[msg.chat_id].push(msg);
        });
      })

      // Handle per-chat load
      .addCase(loadMessagesFromDB.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadMessagesFromDB.fulfilled, (state, action) => {
        const { chatId, messages } = action.payload;
        state.entities[chatId] = messages;
        state.loading = false;
      })
      .addCase(loadMessagesFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Handle server sync
      .addCase(syncWithServer.fulfilled, (state, action) => {
        action.payload.forEach(msg => {
          if (!state.entities[msg.chat_id]) {
            state.entities[msg.chat_id] = [];
          }
          state.entities[msg.chat_id].push(msg);
        });
        state.lastSyncTimestamp = Date.now();
      });
  }
});

export const { addMessage, updateMessageStatus, setMessagesForChat } = messagesSlice.actions;
export default messagesSlice.reducer;
