import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isOnline: navigator.onLine,
  wsConnected: false
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },
    setWsConnected: (state, action) => {
      state.wsConnected = action.payload;
    }
  }
});

export const { setOnlineStatus, setWsConnected } = connectionSlice.actions;
export default connectionSlice.reducer;
