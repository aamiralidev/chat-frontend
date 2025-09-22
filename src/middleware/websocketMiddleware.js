import { setWsConnected } from '../state/connectionSlice';
import { updateMessageStatus, addMessage } from '../state/messagesSlice';
import { db } from '../data/db';

// Action type constants
const WS_CONNECT = 'connection/initWebSocket';
const WS_DISCONNECT = 'connection/closeWebSocket';
const SEND_MESSAGE = 'messages/sendMessage';

export const websocketMiddleware = store => {
  let socket = null;
  let reconnectTimer = null;

  const connect = (url) => {
    socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('[WS] Connected');
      store.dispatch(setWsConnected(true));

      // Flush pending messages once connected
      flushPendingMessages(store);
    };

    socket.onclose = () => {
      console.log('[WS] Disconnected');
      store.dispatch(setWsConnected(false));
      retryConnection(url);
    };

    socket.onerror = (error) => {
      console.error('[WS] Error', error);
      socket.close();
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      // Handle incoming message
      if (data.type === 'message') {
        // 1. Save to IndexedDB
        await db.messages.add(data);

        // 2. Update Redux
        store.dispatch(addMessage({ chatId: data.chat_id, message: data }));
      }

      // Handle ACK from server
      if (data.type === 'ack') {
        store.dispatch(updateMessageStatus({
          chatId: data.chat_id,
          localId: data.local_id,
          status: 'sent',
          serverId: data.server_id
        }));

        // Update IndexedDB
        await db.messages
          .where('local_id')
          .equals(data.local_id)
          .modify({ status: 'sent', server_id: data.server_id });
      }
    };
  };

  const retryConnection = (url) => {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      console.log('[WS] Retrying connection...');
      connect(url);
      reconnectTimer = null;
    }, 3000);
  };

  return next => action => {
    switch (action.type) {
      case WS_CONNECT:
        if (!socket || socket.readyState === WebSocket.CLOSED) {
          connect(action.payload); // payload = WebSocket URL
        }
        break;

      case WS_DISCONNECT:
        if (socket) {
          socket.close();
        }
        break;

      case SEND_MESSAGE:
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(action.payload));
        } else {
          console.log('[WS] Not connected. Message will be sent later.');
        }
        break;

      default:
        break;
    }

    return next(action);
  };
};

// Flush all messages with status=pending
async function flushPendingMessages(store) {
  const pending = await db.messages.where('status').equals('pending').toArray();

  if (pending.length > 0) {
    console.log(`[WS] Flushing ${pending.length} pending messages`);
  }

  for (const message of pending) {
    store.dispatch({
      type: 'messages/sendMessage',
      payload: message
    });
  }
}
