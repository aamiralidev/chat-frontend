import { setWsConnected } from '../state/connectionSlice';
import { updateMessageStatus, addMessage } from '../state/messagesSlice';
import { saveMessage as addMessageToDB, updateMessageStatus as updateMessageStatusInDB } from '../data/messagesDB';
import { receiveConversation } from '@/state/conversationsSlice';
import {WEBSOCKET_URL} from '@/api/endpoints'

// Action type constants
const WS_CONNECT = 'connection/initWebSocket';
const WS_DISCONNECT = 'connection/closeWebSocket';
const SEND_MESSAGE = 'messages/sendMessage/pending';
const RESEND_PENDING = 'messages/resendPending'
const CREATE_CHAT = 'chats/createConversation'

let reconnectAttempts = 0;
let reconnectTimer = null;

export const websocketMiddleware = store => {
  let socket = null;

  const connect = () => {
    if (socket && socket.readyState === WebSocket.OPEN) return;
    const state = store.getState();
  const currentUser = state.auth.currentUser;   // <-- access via store
  const token = currentUser?.token || currentUser?.id;
    socket = new WebSocket(`${WEBSOCKET_URL}?token=${token}`);

    socket.onopen = async () => {
      console.log('[WS] Connected');
      reconnectAttempts = 0;
      store.dispatch(setWsConnected(true));
    };

    socket.onclose = () => {
      console.log('[WS] Disconnected');
      store.dispatch(setWsConnected(false));
      retryConnection();
    };

    socket.onerror = (error) => {
      console.error('[WS] Error', error);
      // socket.close();
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'MESSAGE_RECEIVED':
          // 1. Save to IndexedDB
          await addMessageToDB(data.message);

          // 2. Update Redux
          store.dispatch(addMessage({ chatId: data.message.convo_id, message: data.message }));
          break;

        case 'MESSAGE_ACK':
          // Update Redux state
          store.dispatch(updateMessageStatus({
            chatId: data.convo_id,
            localId: data.local_id,
            status: 'sent',
            serverId: data.server_id
          }));

          // Update IndexedDB
          await updateMessageStatusInDB(data.local_id, { status: 'sent', server_id: data.server_id })
          break;

        case 'CREATE_CHAT':
          store.dispatch(receiveConversation(data))
          break;

        default:
          console.warn('[WS] Unknown message type:', data.type, data);
      }
    };
  };

  const retryConnection = () => {
    if (reconnectTimer) return;

    reconnectAttempts++;
    const delay = Math.min(5000, 1000 * reconnectAttempts); // max 5 sec

    reconnectTimer = setTimeout(() => {
      console.log(`[WS] Retrying connection... Attempt ${reconnectAttempts}`);
      connect();
      reconnectTimer = null;
    }, delay);
  };

  return next => action => {
    console.log("Action type is : ", action.type)
    switch (action.type) {
      case WS_CONNECT:
        connect(action.payload); // payload = WebSocket URL
        break;

      case WS_DISCONNECT:
        // if (socket) {
        //   socket.close();
        // }
        break;

      case SEND_MESSAGE:
        console.log("Capturing and sending: ", action.meta.arg.message)
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: action.meta.arg.message }));
        } else {
          console.log('[WS] Not connected. Message will be sent later.');
        }
        break;
      case RESEND_PENDING:
        console.log("Resending pending: ", action.payload)
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: action.payload }));
        } else {
          console.log('[WS] Not connected. Message will be sent later.');
        }
        break;
      case CREATE_CHAT:
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: CREATE_CHAT, payload: action.payload }));
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
