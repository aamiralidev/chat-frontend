import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentUser: {
    id: 0,
    username: 'Alice',  // just a username for now
  },
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCurrentUser: (state, action) => {
      // action.payload should be { id, username, ... }
      state.currentUser = action.payload;
    },
  },
});

export const { setCurrentUser } = authSlice.actions;
export default authSlice.reducer;
