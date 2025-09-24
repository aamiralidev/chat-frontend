// src/hooks/useWebSocket.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const WS_CONNECT = 'connection/initWebSocket';
const WS_DISCONNECT = 'connection/closeWebSocket';

export function useWebSocket(wsUrl) {
  const dispatch = useDispatch();
  const { websocketConnected, networkOnline } = useSelector(state => state.connection);

  useEffect(() => {
    if (!networkOnline) {
      // Browser offline → disconnect WebSocket if open
      dispatch({ type: WS_DISCONNECT });
      return;
    }

    if (wsUrl) {
      // Browser online → connect to WebSocket
      dispatch({ type: WS_CONNECT, payload: wsUrl });
    }

    return () => {
      dispatch({ type: WS_DISCONNECT });
    };
  }, [wsUrl, networkOnline, dispatch]);

  return {
    connected: websocketConnected,
    connect: () => dispatch({ type: WS_CONNECT, payload: wsUrl }),
    disconnect: () => dispatch({ type: WS_DISCONNECT }),
  };
}
