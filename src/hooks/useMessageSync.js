// src/hooks/useMessageSync.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { processPendingMessages } from '@/sync/outgoingQueue';
import { fetchMissedMessages, fetchUpdatedConversations } from '@/sync/deltaSync';
import { loadCachedConversations } from '@/state/conversationsSlice';

export const useMessageSync = () => {
  const dispatch = useDispatch();

  // ✅ Directly read connection status from Redux
  const { isOnline, wsConnected } = useSelector((state) => state.connection);

  useEffect(() => {
    if (isOnline && wsConnected) {
      console.log('[SYNC] Running message and conversation sync...');

      // 1. Flush pending outgoing messages
      processPendingMessages();

      // 2. Fetch updated conversations from the server
      fetchUpdatedConversations();

      // 3. Fetch missed messages from the server
      fetchMissedMessages();

      // 4. Load cached conversations into Redux state
      dispatch(loadCachedConversations());
    }
  }, [isOnline, wsConnected, dispatch]);
};
