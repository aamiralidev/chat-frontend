import Dexie from 'dexie';

export const db = new Dexie('ChatApp');

db.version(1).stores({
  messages: '++id, local_id, server_id, chat_id, timestamp, status',
  conversations: '++id, chat_id, last_message_timestamp',
  meta: '&key, value'
});
