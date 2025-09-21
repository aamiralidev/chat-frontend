import { useDispatch, useSelector } from "react-redux";
import { setDark, setLight } from "./state/themeSlice";
import { useEffect } from "react";

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
  return (
    <div className={darkMode ? "dark" : ""}>
      <ChatPage />
    </div>)

}
