import { configureStore } from "@reduxjs/toolkit";
import sidebarReducer from "./sidebarSlice";
import messagesReducer from "./messagesSlice";
import chatReducer from "./chatSlice"
import themeReducer from "./themeSlice";

export const store = configureStore({
  reducer: {
    sidebar: sidebarReducer,
    messages: messagesReducer,
    chat: chatReducer,
    theme: themeReducer,
  },
});

export default store;
