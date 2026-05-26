import "server-only";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = mysql.createPool(connectionString);

export const db = drizzle(pool, { schema, mode: "default" });
export { schema, pool };

export type DatabaseClient = typeof db;
export type DatabaseTransaction = Parameters<
  Parameters<DatabaseClient["transaction"]>[0]
>[0];
export type DbExecutor = DatabaseClient | DatabaseTransaction;
