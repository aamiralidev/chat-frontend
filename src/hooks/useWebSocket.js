// src/hooks/useWebSocket.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WEBSOCKET_URL } from '@/api/endpoints';

const WS_CONNECT = 'connection/initWebSocket';
const WS_DISCONNECT = 'connection/closeWebSocket';

export function useWebSocket() {
  const dispatch = useDispatch();
  const { websocketConnected, networkOnline } = useSelector(state => state.connection);

  useEffect(() => {

    if (WEBSOCKET_URL) {
      console.log("dispatcing connect")
      // Browser online → connect to WebSocket
      dispatch({ type: WS_CONNECT });
    }

    return () => {
      dispatch({ type: WS_DISCONNECT });
    };
  }, [networkOnline, dispatch]);

  return {
    connected: websocketConnected,
    connect: () => dispatch({ type: WS_CONNECT}),
    disconnect: () => dispatch({ type: WS_DISCONNECT }),
  };
}
