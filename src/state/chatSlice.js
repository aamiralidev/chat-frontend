// src/state/conversationSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedChatId: null,
};

const conversationSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    setSelectedChat: (state, action) => {
      state.selectedChatId = action.payload;
    },
    clearSelectedChat: (state) => {
      state.selectedChatId = null;
    },
  },
});

export const { setSelectedChat, clearSelectedChat } = conversationSlice.actions;
export default conversationSlice.reducer;
