import { useDispatch, useSelector } from "react-redux";
import { setDark, setLight } from "./state/themeSlice";
import { useEffect } from "react";
import { useMessageSync } from "./hooks/useMessageSync";
import { useWebSocket } from "./hooks/useWebSocket";
import { useNetworkStatus } from "./hooks/useNetworkStatus";

import ChatPage from "./pages/ChatPage";

export default function App() {
  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.theme.darkMode);
  // WebSocket lifecycle
  useWebSocket();
  // Track network online/offline
  useNetworkStatus();
  // Manage message syncing
  useMessageSync();

  useEffect(() => {
    if (darkMode === null) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      prefersDark ? dispatch(setDark()) : dispatch(setLight());
      // dispatch(setDark())
    }
  }, [darkMode, dispatch]);

  return (
    <div className={darkMode ? "dark" : ""}>
      <ChatPage />
    </div>)

}
