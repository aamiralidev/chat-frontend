import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getAllConversations, saveConversation } from "@/data/conversationsDB";

const initialState = {
  chats: [
    // chatId: { id, title, participants, lastMessage, unreadCount }
  ],
  loading: false,
  error: null,
};

export const loadCachedConversations = createAsyncThunk(
  "chats/loadCachedConversations",
  async () => {
    try {
      const conversations = await getAllConversations(); 
      return conversations;
    } catch (error) {
      console.error("[ChatSlice] Failed to load cached conversations:", error);
      throw error;
    }
  }
);

export const receiveConversation = createAsyncThunk(
  "chats/receiveConversation",
  async (conversation, { dispatch }) => {
    await persistConversationLocally(conversation, dispatch);
    return conversation;
  }
);

export const createConversation = createAsyncThunk(
  "chats/createConversation",
  async (conversation, { dispatch }) => {
    // Mark as pending if offline
    const conversationWithStatus = {
      ...conversation,
      status: "pending",
    };

    await persistConversationLocally(conversationWithStatus, dispatch);

    // Middleware will intercept this action and send to backend
    return conversationWithStatus;
  }
);




// Neither a thunk, nor a reducer, just a helper function
export const persistConversationLocally = async (conversation, dispatch) => {
  try {
    dispatch(addNewChat(conversation));
    // 1. Save to IndexedDB
    await saveConversation(conversation);

    // 2. Update Redux state

    console.log(`[LOCAL] Conversation ${conversation.id} saved locally`);
  } catch (error) {
    console.error("[LOCAL] Failed to save conversation:", error);
  }
};

const chatSlice = createSlice({
  name: "chats",
  initialState,
  reducers: {
    setChats: (state, action) => {
      const chats = action.payload;
      chats.forEach((chat) => {
        state.chats[chat.id] = chat;
      });
    },

    updateChat: (state, action) => {
      const chat = action.payload;
      state.chats[chat.id] = { ...state.chats[chat.id], ...chat };
    },

    incrementUnread: (state, action) => {
      const { chatId } = action.payload;
      if (!state.chats[chatId]) return;
      state.chats[chatId].unreadCount = (state.chats[chatId].unreadCount || 0) + 1;
    },

    resetUnread: (state, action) => {
      const { chatId } = action.payload;
      if (state.chats[chatId]) {
        state.chats[chatId].unreadCount = 0;
      }
    },

    addNewChat: (state, action) => {
      const chat = action.payload;
      state.chats[chat.id] = chat;
    },

    /**
     * Update the last message for a conversation.
     * payload: { chatId, message }
     */
    updateLastMessage: (state, action) => {
      const { chatId, message } = action.payload;
      if (!state.chats[chatId]) return;

      // Only update if it's newer than current last message
      const currentLast = state.chats[chatId].lastMessage;
      if (!currentLast || message.timestamp > currentLast.timestamp) {
        state.chats[chatId].lastMessage = message;
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadCachedConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadCachedConversations.fulfilled, (state, action) => {
        state.loading = false;
        const conversations = action.payload;
        conversations.forEach((chat) => {
          state.chats[chat.id] = chat;
        });
      })
      .addCase(loadCachedConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Failed to load conversations";
      });
  },
});

export const {
  setChats,
  updateChat,
  incrementUnread,
  resetUnread,
  updateLastMessage, // ✅ Export the new action
  addNewChat,
} = chatSlice.actions;

export default chatSlice.reducer;
