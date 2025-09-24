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
    setNetworkStatus: (state, action) => {
      state.isOnline = action.payload;
    },
    setWsConnected: (state, action) => {
      state.wsConnected = action.payload;
    }
  }
});

export const { setOnlineStatus, setWsConnected, setNetworkStatus } = connectionSlice.actions;

// Thunks for controlling WebSocket
export const initWebSocket = (url) => ({
  type: 'connection/initWebSocket',
  payload: url
});

export const closeWebSocket = () => ({
  type: 'connection/closeWebSocket'
});


export default connectionSlice.reducer;
