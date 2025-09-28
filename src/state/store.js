import { configureStore } from "@reduxjs/toolkit";
import sidebarReducer from "./sidebarSlice";
import messagesReducer from "./messagesSlice";
import chatReducer from "./selectedChatSlice"
import themeReducer from "./themeSlice";
import conversationsReducer from './conversationsSlice';
import connectionReducer from './connectionSlice';
import { websocketMiddleware } from '../middleware/websocketMiddleware';
import authReducer from './authSlice';


export const store = configureStore({
  reducer: {
    auth: authReducer,
    sidebar: sidebarReducer,
    messages: messagesReducer,
    conversations: conversationsReducer,
    connection: connectionReducer,
    selectedChat: chatReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(websocketMiddleware)
});

export default store;
