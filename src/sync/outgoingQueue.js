// sync/outgoingQueue.js

import { getPendingMessages } from '../data/messagesDB'
import { store } from '../state/store'

// Flush all messages with status=pending
export async function processPendingMessages() {
  const pending = await getPendingMessages();

  if (pending.length > 0) {
    console.log(`[WS] Flushing ${pending.length} pending messages`);
  }

  for (const message of pending) {
    store.dispatch({
      type: 'messages/resendPending',
      payload: message
    });
  }
}