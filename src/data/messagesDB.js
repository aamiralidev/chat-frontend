// data/messagesDB.js
import { db } from "./db";

// Save a new message
export async function saveMessage(message) {
  return db.messages.add(message);
}

// Update message status (e.g., pending → sent)
export async function updateMessageStatus(localId, status, serverId = null) {
  return db.messages.where("local_id").equals(localId).modify({
    status,
    ...(serverId ? { server_id: serverId } : {}),
  });
}

// Get messages that are pending to be sent
export async function getPendingMessages() {
  return db.messages.where("status").equals("pending").toArray();
}

// Fetch all messages for a specific chat, sorted by timestamp
export async function getMessagesForChat(chatId) {
  return db.messages
    .where("chat_id")
    .equals(chatId)
    .sortBy("timestamp");
}

// Cleanup old messages to prevent DB from growing forever
export async function deleteOldMessages(limit = 1000) {
  const all = await db.messages.toArray();
  if (all.length <= limit) return;

  const excess = all
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, all.length - limit);

  const idsToDelete = excess.map(msg => msg.id);
  await db.messages.bulkDelete(idsToDelete);
}
