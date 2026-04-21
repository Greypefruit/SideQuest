import "server-only";
import { asc, eq } from "drizzle-orm";
import { activityTypes } from "../schema";
import { DEFAULT_ACTIVITY_CODE, getDb } from "./shared";
import { type DbExecutor } from "../index";

export async function getActivityTypeByCode(
  code: string,
  database?: DbExecutor,
) {
  const [activityType] = await getDb(database)
    .select()
    .from(activityTypes)
    .where(eq(activityTypes.code, code.trim()))
    .limit(1);

  return activityType ?? null;
}

export async function getDefaultActivityType(database?: DbExecutor) {
  return getActivityTypeByCode(DEFAULT_ACTIVITY_CODE, database);
}

export async function listActivityTypes(
  options?: { activeOnly?: boolean },
  database?: DbExecutor,
) {
  const query = getDb(database).select().from(activityTypes).orderBy(asc(activityTypes.nameRu));

  if (options?.activeOnly === true) {
    return query.where(eq(activityTypes.isActive, true));
  }

  return query;
}
