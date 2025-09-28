import { db } from '../data/db';
import { fetchMissedMessagesSince, fetchMissedConvosSince } from '../api/restClient';

/**
 * Fetch updated conversations for the current user.
 * These could be new conversations or updates to existing ones.
 */
export const fetchUpdatedConversations = async () => {

  // Get the last global conversation sync timestamp
  const lastSyncMeta = await db.meta.get('lastConversationSyncTimestamp');
  const lastSyncTime = lastSyncMeta?.value || 0;

  console.log(`[SYNC] Fetching conversations since ${lastSyncTime}`);

  // Pass user_id to the API
  const conversations = await fetchMissedConvosSince(lastSyncTime);

  if (!Array.isArray(conversations) || conversations.length === 0) {
    console.log('[SYNC] No updated conversations from server.');
    return [];
  }

  // Save conversations to IndexedDB
  await db.conversations.bulkPut(conversations);

  // Update meta timestamp
  await db.meta.put({ key: 'lastConversationSyncTimestamp', value: Date.now() });

  console.log(`[SYNC] Stored ${conversations.length} updated conversations.`);

  return conversations;
};

/**
 * Fetch missed messages for the current user since the last global message sync.
 */
export const fetchMissedMessages = async () => {

  // Fetch last global message sync timestamp
  const lastSyncMeta = await db.meta.get('lastMessageSyncTimestamp');
  const lastTimestamp = lastSyncMeta?.value || 0;

  console.log(`[SYNC] Fetching messages since ${lastTimestamp}`);

  // Pass user_id to the API
  const response = await fetchMissedMessagesSince(lastTimestamp);
  const newMessages = response.data || [];

  if (!Array.isArray(newMessages) || newMessages.length === 0) {
    console.log('[SYNC] No new messages from server.');
    return [];
  }

  console.log(`[SYNC] Received ${newMessages.length} messages from server.`);

  // Deduplicate using server_id
  const existingServerIds = new Set(
    (await db.messages.toArray()).map(m => m.server_id)
  );

  const deduped = newMessages.filter(msg => !existingServerIds.has(msg.server_id));

  if (deduped.length === 0) {
    console.log('[SYNC] All fetched messages already exist locally. Skipping insert.');
    return [];
  }

  // Save deduplicated messages into IndexedDB
  await db.messages.bulkPut(deduped);

  // Update sync timestamp
  await db.meta.put({ key: 'lastMessageSyncTimestamp', value: Date.now() });

  console.log(`[SYNC] Stored ${deduped.length} new messages and updated sync timestamp.`);

  return deduped;
};




// // src/sync/deltaSync.js (continuation)
// export const fetchMissedMessages = async () => {
//   // Get all conversations from IndexedDB
//   const conversations = await db.conversations.toArray();

//   if (conversations.length === 0) {
//     console.log('[SYNC] No conversations found. Skipping message sync.');
//     return [];
//   }

//   let totalNewMessages = [];

//   for (const convo of conversations) {
//     const metaKey = `lastSync_${convo.id}`;
//     const lastSyncMeta = await db.meta.get(metaKey);
//     const lastTimestamp = lastSyncMeta?.value || 0;

//     console.log(`[SYNC] Fetching messages for chat ${convo.id} since ${lastTimestamp}`);

//     const response = await api.get(`/messages?chat_id=${convo.id}&since=${lastTimestamp}`);
//     const newMessages = response.data || [];

//     if (!Array.isArray(newMessages) || newMessages.length === 0) continue;

//     // Deduplicate by server_id
//     const existingIds = new Set(
//       (await db.messages.where('chat_id').equals(convo.id).toArray()).map(m => m.server_id)
//     );

//     const deduped = newMessages.filter(m => !existingIds.has(m.server_id));

//     if (deduped.length > 0) {
//       await db.messages.bulkPut(deduped);
//       console.log(`[SYNC] Stored ${deduped.length} new messages for chat ${convo.id}`);
//       totalNewMessages = totalNewMessages.concat(deduped);
//     }

//     // Update sync timestamp for this chat
//     await db.meta.put({ key: metaKey, value: Date.now() });
//   }

//   return totalNewMessages;
// };
