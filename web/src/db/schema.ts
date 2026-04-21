import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  role: varchar("role", { length: 30 }).notNull().default("player"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
