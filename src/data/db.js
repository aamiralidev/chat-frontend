import Dexie from 'dexie';

export const db = new Dexie('ChatApp');

db.version(1).stores({
  messages: '++id, local_id, server_id, convo_id, timestamp, status',
  conversations: '++id, convo_id, last_message_timestamp',
  meta: '&key, value'
});
