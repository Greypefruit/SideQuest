import "server-only";
import { asc, desc, getTableColumns, sql } from "drizzle-orm";
import { type AnyPgColumn } from "drizzle-orm/pg-core";
import { db, type DbExecutor } from "../index";
import { activityTypes, participants, profiles, rankings } from "../schema";

export const DEFAULT_ACTIVITY_CODE = "table_tennis" as const;

export function getDb(database?: DbExecutor) {
  return database ?? db;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hasValues<T extends Record<string, unknown>>(value: T) {
  return Object.keys(value).length > 0;
}

export function eqNormalizedEmail(column: AnyPgColumn, email: string) {
  return sql`lower(${column}) = ${normalizeEmail(email)}`;
}

export const profileColumns = getTableColumns(profiles);
export const activityTypeColumns = getTableColumns(activityTypes);
export const participantColumns = getTableColumns(participants);
export const rankingColumns = getTableColumns(rankings);

export const activityParticipantOrder = [
  asc(profiles.displayName),
  asc(profiles.email),
] as const;

export const rankingOrder = [
  desc(rankings.rating),
  desc(rankings.matchesPlayed),
  desc(rankings.wins),
  asc(rankings.losses),
  asc(profiles.displayName),
  asc(profiles.email),
] as const;
