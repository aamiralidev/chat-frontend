import { createSlice } from "@reduxjs/toolkit";
import { messages as mockMessages } from "../mock/messages";

const initialState = {
  list: mockMessages,
};

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.list.push(action.payload);
    },
    clearMessages: (state) => {
      state.list = [];
    },
  },
});

export const { addMessage, clearMessages } = messagesSlice.actions;
export default messagesSlice.reducer;
