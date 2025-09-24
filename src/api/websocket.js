// src/api/websocket.js
import { store } from '../store';
import { updateMessageStatus, addMessage } from '../features/messages/messagesSlice';
import { db } from '../data/db';
import { setWsConnected } from '@/state/connectionSlice';

let socket = null;
let reconnectAttempts = 0;
let messageQueue = [];

// WebSocket server URL (replace with your backend URL)
const WS_URL = 'ws://localhost:4000/ws';

export const initWebSocket = () => {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  socket = new WebSocket(WS_URL);

  socket.onopen = async () => {
    console.log('[WebSocket] Connected');
    reconnectAttempts = 0;
    store.dispatch(setWsConnected(true))

    // Flush queued messages
    await flushPendingMessages();
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'MESSAGE_RECEIVED':
        store.dispatch(addMessage({ chatId: data.message.chat_id, message: data.message }));
        // Save to IndexedDB
        db.messages.add(data.message);
        break;

      case 'MESSAGE_ACK':
        // Server acknowledges message
        store.dispatch(updateMessageStatus({
          chatId: data.chat_id,
          localId: data.local_id,
          serverId: data.server_id,
          status: 'sent'
        }));
        // Update in IndexedDB
        db.messages.update(data.local_id, {
          server_id: data.server_id,
          status: 'sent'
        });
        break;

      default:
        console.warn('[WebSocket] Unknown event type:', data.type);
    }
  };

  socket.onclose = () => {
    console.log('[WebSocket] Disconnected, retrying...');
    store.dispatch(setWsConnected(false))
    attemptReconnect();
  };

  socket.onerror = (err) => {
    console.error('[WebSocket] Error:', err);
    socket.close(); // will trigger onclose
    store.dispatch(setWsConnected(false))
  };
};

export const sendMessage = async (message) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: message }));
  } else {
    console.warn('[WebSocket] Offline, queuing message');
    messageQueue.push(message);
  }
};

// Attempt reconnection with exponential backoff
function attemptReconnect() {
  reconnectAttempts++;
  const delay = Math.min(5000, 1000 * reconnectAttempts); // max 5 sec
  setTimeout(initWebSocket, delay);
}

// Flush pending messages (from both memory and IndexedDB)
async function flushPendingMessages() {
  console.log('[WebSocket] Flushing pending messages...');

  // Send messages queued in memory
  while (messageQueue.length > 0) {
    const msg = messageQueue.shift();
    sendMessage(msg);
  }

  // Send messages stored in IndexedDB
  const pending = await db.messages.where('status').equals('pending').toArray();
  for (const msg of pending) {
    sendMessage(msg);
  }
}
