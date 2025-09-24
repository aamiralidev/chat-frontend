// src/hooks/useNetworkStatus.js
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setNetworkStatus } from '../state/connectionSlice';

export function useNetworkStatus() {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleOnline = () => dispatch(setNetworkStatus(true));
    const handleOffline = () => dispatch(setNetworkStatus(false));

    // Initialize with current status
    dispatch(setNetworkStatus(navigator.onLine));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);
}
