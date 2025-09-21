import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedChatId: null, // currently active conversation
};

export const chatSlice = createSlice({
  name: "chat",
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

export const { setSelectedChat, clearSelectedChat } = chatSlice.actions;
export default chatSlice.reducer;
