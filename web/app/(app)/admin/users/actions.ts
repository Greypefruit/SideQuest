"use server";

import { revalidatePath } from "next/cache";
import { requireAdminViewer } from "@/src/auth/current-viewer";
import { db } from "@/src/db";
import {
  countActiveAdminProfiles,
  getProfileById,
  lockActiveAdminProfilesForUpdate,
  lockProfileByIdForUpdate,
  updateProfile,
} from "@/src/db/queries";

const ALLOWED_ROLES = ["player", "organizer", "admin"] as const;

type ProfileRole = (typeof ALLOWED_ROLES)[number];

type UpdateUserRoleInput = {
  profileId: string;
  role: string;
};

type ToggleUserStatusInput = {
  profileId: string;
};

export type UserManagementActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

function buildSuccess(message: string): UserManagementActionResult {
  return { ok: true, message };
}

function buildError(message: string): UserManagementActionResult {
  return { ok: false, message };
}

function isAllowedRole(role: string): role is ProfileRole {
  return ALLOWED_ROLES.includes(role as ProfileRole);
}

function getRoleLabel(role: ProfileRole) {
  switch (role) {
    case "player":
      return "Игрок";
    case "organizer":
      return "Организатор";
    case "admin":
      return "Администратор";
  }
}

export async function updateUserRoleAction(
  input: UpdateUserRoleInput,
): Promise<UserManagementActionResult> {
  await requireAdminViewer();

  if (!input.profileId.trim()) {
    return buildError("Не удалось определить пользователя.");
  }

  if (!isAllowedRole(input.role)) {
    return buildError("Указана недопустимая роль.");
  }

  const nextRole: ProfileRole = input.role;

  const result = await db.transaction(async (tx) => {
    await lockActiveAdminProfilesForUpdate(tx);
    await lockProfileByIdForUpdate(input.profileId, tx);

    const targetProfile = await getProfileById(input.profileId, tx);

    if (!targetProfile) {
      return buildError("Пользователь не найден.");
    }

    if (targetProfile.role === input.role) {
      return buildError("У пользователя уже установлена эта роль.");
    }

    if (targetProfile.role === "admin" && targetProfile.isActive && nextRole !== "admin") {
      const activeAdminCount = await countActiveAdminProfiles(tx);

      if (activeAdminCount <= 1) {
        return buildError(
          "Нельзя понизить последнего активного администратора.",
        );
      }
    }

    const updatedProfile = await updateProfile(
      input.profileId,
      {
        role: nextRole,
      },
      tx,
    );

    if (!updatedProfile) {
      return buildError("Не удалось обновить роль пользователя.");
    }

    return buildSuccess(
      `Роль пользователя изменена на «${getRoleLabel(updatedProfile.role)}».`,
    );
  });

  if (result.ok) {
    revalidatePath("/admin/users");
  }

  return result;
}

export async function deactivateUserAction(
  input: ToggleUserStatusInput,
): Promise<UserManagementActionResult> {
  await requireAdminViewer();

  if (!input.profileId.trim()) {
    return buildError("Не удалось определить пользователя.");
  }

  const result = await db.transaction(async (tx) => {
    await lockActiveAdminProfilesForUpdate(tx);
    await lockProfileByIdForUpdate(input.profileId, tx);

    const targetProfile = await getProfileById(input.profileId, tx);

    if (!targetProfile) {
      return buildError("Пользователь не найден.");
    }

    if (!targetProfile.isActive) {
      return buildError("Пользователь уже деактивирован.");
    }

    if (targetProfile.role === "admin") {
      const activeAdminCount = await countActiveAdminProfiles(tx);

      if (activeAdminCount <= 1) {
        return buildError(
          "Нельзя деактивировать последнего активного администратора.",
        );
      }
    }

    const updatedProfile = await updateProfile(
      input.profileId,
      {
        isActive: false,
      },
      tx,
    );

    if (!updatedProfile) {
      return buildError("Не удалось деактивировать пользователя.");
    }

    return buildSuccess("Пользователь деактивирован.");
  });

  if (result.ok) {
    revalidatePath("/admin/users");
  }

  return result;
}

export async function activateUserAction(
  input: ToggleUserStatusInput,
): Promise<UserManagementActionResult> {
  await requireAdminViewer();

  if (!input.profileId.trim()) {
    return buildError("Не удалось определить пользователя.");
  }

  const result = await db.transaction(async (tx) => {
    await lockActiveAdminProfilesForUpdate(tx);
    await lockProfileByIdForUpdate(input.profileId, tx);

    const targetProfile = await getProfileById(input.profileId, tx);

    if (!targetProfile) {
      return buildError("Пользователь не найден.");
    }

    if (targetProfile.isActive) {
      return buildError("Пользователь уже активен.");
    }

    const updatedProfile = await updateProfile(
      input.profileId,
      {
        isActive: true,
      },
      tx,
    );

    if (!updatedProfile) {
      return buildError("Не удалось активировать пользователя.");
    }

    return buildSuccess("Пользователь активирован.");
  });

  if (result.ok) {
    revalidatePath("/admin/users");
  }

  return result;
}
