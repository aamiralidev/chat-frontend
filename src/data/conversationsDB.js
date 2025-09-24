// data/conversationsDB.js
import { db } from "./db";

// Save or update a conversation
export async function saveConversation(conversation) {
  return db.conversations.put(conversation);
}

// Get all conversations
export async function getAllConversations() {
  // 1. Fetch all conversations
  const conversations = await db.conversations.toArray();

  if (conversations.length === 0) {
    return [];
  }

  // 2. For each conversation, fetch its latest message
  const conversationsWithLastMessage = await Promise.all(
    conversations.map(async (conversation) => {
      const lastMessage = await db.messages
        .where("chat_id")
        .equals(conversation.id)
        .reverse()        // Order by most recent
        .sortBy("timestamp"); // Make sure messages have a timestamp field like `created_at`

      return {
        ...conversation,
        lastMessage: lastMessage.length > 0 ? lastMessage[0] : null,
      };
    })
  );
  return conversationsWithLastMessage;
}

