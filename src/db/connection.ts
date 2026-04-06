import { MongoClient, type Db } from "mongodb";

let _client: MongoClient | null = null;
let _db: Db | null = null;

export function initDb(databaseUrl: string): Db {
  if (_db) return _db;
  _client = new MongoClient(databaseUrl);
  // Parse database name from URL, default to "skillbot"
  const dbName = databaseUrl.split("/").pop()?.split("?")[0] ?? "skillbot";
  _db = _client.db(dbName);
  return _db;
}

export async function connectDb(): Promise<void> {
  if (!_client) throw new Error("initDb() must be called before connectDb()");
  await _client.connect();
}

export function getDb(): Db {
  if (!_db) throw new Error("Database not initialized. Call initDb() first.");
  return _db;
}

export async function closeDb(): Promise<void> {
  await _client?.close();
  _client = null;
  _db = null;
}

export type DbInstance = Db;

