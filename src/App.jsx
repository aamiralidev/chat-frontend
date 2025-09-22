import { useDispatch, useSelector } from "react-redux";
import { setDark, setLight } from "./state/themeSlice";
import { useEffect } from "react";
import { loadCachedMessages, syncWithServer } from './state/messagesSlice';
import { initWebSocket } from './state/connectionSlice';

import ChatPage from "./pages/ChatPage";

export default function App() {
  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.theme.darkMode);
  useEffect(() => {
    if (darkMode === null) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      prefersDark ? dispatch(setDark()) : dispatch(setLight());
      // dispatch(setDark())
    }
  }, [darkMode, dispatch]);

  useEffect(() => {
    const initializeApp = async () => {
      console.log('[Init] Starting app initialization');

      // 1. Load cached messages into Redux
      await dispatch(loadCachedMessages());
      console.log('[Init] Loaded cached messages');

      // 2. Connect WebSocket
      dispatch(initWebSocket('wss://chat.example.com/ws'));
      console.log('[Init] WebSocket initialized');

      // 3. Fetch missed messages via REST API
      await dispatch(syncWithServer({ lastSyncTimestamp: 0 })); // 0 = first sync
      console.log('[Init] Synced with server');
    };

    initializeApp();
  }, [dispatch]);
  return (
    <div className={darkMode ? "dark" : ""}>
      <ChatPage />
    </div>)

}
