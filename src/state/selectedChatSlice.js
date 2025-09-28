// src/state/conversationSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  Current: {},
};

const conversationSlice = createSlice({
  name: "selectedChat",
  initialState,
  reducers: {
    setSelectedChat: (state, action) => {
      console.log("Updating chatid: ", action.payload)
      state.Current = action.payload;
    },
    clearSelectedChat: (state) => {
      state.Current = {};
    },
  },
});

export const { setSelectedChat, clearSelectedChat } = conversationSlice.actions;
export default conversationSlice.reducer;
