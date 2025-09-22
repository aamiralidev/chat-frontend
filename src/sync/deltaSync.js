import { db } from '../data/db';
import { api } from '../api/restClient';

export const fetchMissedMessages = async (chatId) => {
  const lastTimestamp = await db.meta.get({ key: `lastSync_${chatId}` }) || 0;

  const messages = await api.get(`/messages?chat_id=${chatId}&since=${lastTimestamp}`);

  for (const msg of messages.data) {
    await db.messages.put(msg);
  }

  await db.meta.put({ key: `lastSync_${chatId}`, value: Date.now() });
};
