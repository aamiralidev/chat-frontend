import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  darkMode: false,
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggle: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDark: (state) => {
      state.darkMode = true;
    },
    setLight: (state) => {
      state.darkMode = false;
    },
  },
});

export const { toggle, setDark, setLight } = themeSlice.actions;
export default themeSlice.reducer;
