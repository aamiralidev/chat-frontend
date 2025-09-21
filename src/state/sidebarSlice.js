import { createSlice } from "@reduxjs/toolkit";

const initialState = { isOpen: false };

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {
    toggle: (state) => { state.isOpen = !state.isOpen; },
    open: (state) => { state.isOpen = true; },
    close: (state) => { state.isOpen = false; },
  },
});

export const { toggle, open, close } = sidebarSlice.actions;
export default sidebarSlice.reducer;
