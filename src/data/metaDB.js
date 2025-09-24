// data/metaDB.js
import { db } from "./db";

// Get last sync timestamp
export async function getLastSyncTimestamp() {
  const meta = await db.meta.get("lastSyncTimestamp");
  return meta ? meta.value : null;
}

// Set last sync timestamp
export async function setLastSyncTimestamp(timestamp) {
  await db.meta.put({ key: "lastSyncTimestamp", value: timestamp });
}

// Clear meta table (e.g., on logout)
export async function clearMeta() {
  await db.meta.clear();
}
