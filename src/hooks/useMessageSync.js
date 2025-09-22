import { useEffect } from 'react';
import { useConnectionStore } from '../state/useConnectionStore';
import { processPendingMessages } from '../sync/outgoingQueue';
import { fetchMissedMessages } from '../sync/deltaSync';

export const useMessageSync = () => {
  const { isOnline, wsConnected } = useConnectionStore();

  useEffect(() => {
    if (isOnline && wsConnected) {
      processPendingMessages();
      fetchMissedMessages();
    }
  }, [isOnline, wsConnected]);
};
