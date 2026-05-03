"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  activateUserAction,
  deactivateUserAction,
  updateUserRoleAction,
} from "../actions";

type UserRole = "player" | "organizer" | "admin";

type ManagedUser = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isCurrentViewer: boolean;
  isProtectedLastActiveAdmin: boolean;
};

type UsersAdminPanelProps = {
  users: ManagedUser[];
};

function getRoleLabel(role: UserRole) {
  switch (role) {
    case "player":
      return "Игрок";
    case "organizer":
      return "Организатор";
    case "admin":
      return "Администратор";
  }
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.73rem] font-semibold ${
        isActive
          ? "border-slate-200 bg-slate-50 text-slate-700"
          : "border-rose-100 bg-rose-50/60 text-slate-600"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          isActive ? "bg-emerald-500/80" : "bg-rose-400/80"
        }`}
      />
      {isActive ? "Активен" : "Деактивирован"}
    </span>
  );
}

function RoleBadge({
  disabled,
  onClick,
  role,
}: {
  disabled?: boolean;
  onClick?: () => void;
  role: UserRole;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.73rem] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {getRoleLabel(role)}
    </button>
  );
}

function RoleSelect({
  disabled,
  protectedLastAdmin,
  value,
  onChange,
}: {
  disabled: boolean;
  protectedLastAdmin: boolean;
  value: UserRole;
  onChange: (value: UserRole) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as UserRole)}
      className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-2.5 text-[16px] text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 md:h-9 md:text-[0.84rem]"
    >
      <option value="player" disabled={protectedLastAdmin}>
        Игрок
      </option>
      <option value="organizer" disabled={protectedLastAdmin}>
        Организатор
      </option>
      <option value="admin">Администратор</option>
    </select>
  );
}

function UserManagementRow({ user }: { user: ManagedUser }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roleChanged = selectedRole !== user.role;
  const roleChangeBlocked = user.isProtectedLastActiveAdmin && selectedRole !== "admin";

  function refreshPage() {
    router.refresh();
  }

  function handleRoleSubmit() {
    if (!roleChanged || roleChangeBlocked) {
      return;
    }

    const nextRoleLabel = getRoleLabel(selectedRole);

    if (!window.confirm(`Изменить роль пользователя на «${nextRoleLabel}»?`)) {
      return;
    }

    startTransition(async () => {
      const result = await updateUserRoleAction({
        profileId: user.id,
        role: selectedRole,
      });

      setMessage(result.message);

      if (result.ok) {
        setIsEditingRole(false);
        setIsExpanded(false);
        refreshPage();
      }
    });
  }

  function handleRoleEditStart() {
    setSelectedRole(user.role);
    setIsExpanded(true);
    setIsEditingRole(true);
    setMessage(null);
  }

  function handleRoleEditCancel() {
    setSelectedRole(user.role);
    setIsEditingRole(false);
  }

  function handleToggleExpanded() {
    setIsExpanded((currentValue) => {
      const nextValue = !currentValue;

      if (!nextValue) {
        setIsEditingRole(false);
        setSelectedRole(user.role);
      }

      return nextValue;
    });
  }

  function handleToggleActive() {
    const action = user.isActive ? deactivateUserAction : activateUserAction;
    const confirmText = user.isActive
      ? "Деактивировать пользователя?"
      : "Активировать пользователя?";

    if (!window.confirm(confirmText)) {
      return;
    }

    startTransition(async () => {
      const result = await action({
        profileId: user.id,
      });

      setMessage(result.message);

      if (result.ok) {
        setIsExpanded(false);
        refreshPage();
      }
    });
  }

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-3.5 md:hidden">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[0.95rem] font-semibold text-slate-950">
              {user.displayName}
            </p>
            {user.isCurrentViewer ? (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[0.7rem] font-semibold text-blue-700 ring-1 ring-blue-200">
                Вы
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 break-all text-[0.8rem] text-slate-500">{user.email}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isEditingRole ? (
              <div className="flex min-w-[210px] flex-1 flex-col gap-1.5">
                <RoleSelect
                  disabled={isPending}
                  protectedLastAdmin={user.isProtectedLastActiveAdmin}
                  value={selectedRole}
                  onChange={setSelectedRole}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending || !roleChanged || roleChangeBlocked}
                    onClick={handleRoleSubmit}
                    className="inline-flex h-10 items-center justify-center rounded-[10px] border border-slate-300 bg-white px-3 text-[16px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 md:h-8.5 md:text-[0.76rem]"
                  >
                    {isPending ? "Сохраняем..." : "Сохранить"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleRoleEditCancel}
                    className="inline-flex h-10 items-center justify-center rounded-[10px] px-2 text-[16px] font-medium text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300 md:h-8.5 md:text-[0.76rem]"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <RoleBadge
                disabled={isPending}
                onClick={handleRoleEditStart}
                role={user.role}
              />
            )}

            {!isEditingRole ? <StatusBadge isActive={user.isActive} /> : null}
          </div>
        </div>

        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Свернуть действия" : "Показать действия"}
          onClick={handleToggleExpanded}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        >
          <svg
            aria-hidden="true"
            className={`transition ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            height="16"
            viewBox="0 0 16 16"
            width="16"
          >
            <path
              d="M4 6.5 8 10l4-3.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
            />
          </svg>
        </button>
      </div>

      {isExpanded ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="space-y-1.5">
            <button
              type="button"
              disabled={isPending || user.isProtectedLastActiveAdmin}
              onClick={handleToggleActive}
              className={`inline-flex h-10 w-full items-center justify-center rounded-[8px] border bg-white px-3 text-[16px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 md:text-[0.8rem] ${
                user.isActive
                  ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {isPending
                ? "Сохраняем..."
                : user.isActive
                  ? "Деактивировать"
                  : "Активировать"}
            </button>

            {user.isProtectedLastActiveAdmin ? (
              <p className="text-[0.72rem] leading-[1.1rem] text-slate-500">
                Последнего активного администратора нельзя понизить или деактивировать.
              </p>
            ) : null}

            {message ? (
              <p className="text-[0.74rem] leading-[1.1rem] text-slate-500">{message}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DesktopUserManagementRow({ user }: { user: ManagedUser }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roleChanged = selectedRole !== user.role;
  const roleChangeBlocked = user.isProtectedLastActiveAdmin && selectedRole !== "admin";

  function refreshPage() {
    router.refresh();
  }

  function handleRoleSubmit() {
    if (!roleChanged || roleChangeBlocked) {
      return;
    }

    const nextRoleLabel = getRoleLabel(selectedRole);

    if (!window.confirm(`Изменить роль пользователя на «${nextRoleLabel}»?`)) {
      return;
    }

    startTransition(async () => {
      const result = await updateUserRoleAction({
        profileId: user.id,
        role: selectedRole,
      });

      setMessage(result.message);

      if (result.ok) {
        setIsEditingRole(false);
        refreshPage();
      }
    });
  }

  function handleRoleEditStart() {
    setSelectedRole(user.role);
    setIsEditingRole(true);
    setMessage(null);
  }

  function handleRoleEditCancel() {
    setSelectedRole(user.role);
    setIsEditingRole(false);
  }

  function handleToggleActive() {
    const action = user.isActive ? deactivateUserAction : activateUserAction;
    const confirmText = user.isActive
      ? "Деактивировать пользователя?"
      : "Активировать пользователя?";

    if (!window.confirm(confirmText)) {
      return;
    }

    startTransition(async () => {
      const result = await action({
        profileId: user.id,
      });

      setMessage(result.message);

      if (result.ok) {
        refreshPage();
      }
    });
  }

  return (
    <tr className="border-t border-slate-100 align-middle first:border-t-0">
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.88rem] font-semibold text-slate-950">{user.displayName}</p>
            {user.isCurrentViewer ? (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-semibold text-blue-700 ring-1 ring-blue-200">
                Вы
              </span>
            ) : null}
          </div>
          <p className="text-[0.78rem] text-slate-500">{user.email}</p>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="w-[190px] space-y-1.5">
          {isEditingRole ? (
            <>
              <RoleSelect
                disabled={isPending}
                protectedLastAdmin={user.isProtectedLastActiveAdmin}
                value={selectedRole}
                onChange={setSelectedRole}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPending || !roleChanged || roleChangeBlocked}
                  onClick={handleRoleSubmit}
                  className="inline-flex h-[2.125rem] items-center justify-center rounded-[10px] border border-slate-300 bg-white px-3 text-[0.76rem] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {isPending ? "Сохраняем..." : "Сохранить"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleRoleEditCancel}
                  className="inline-flex h-[2.125rem] items-center justify-center rounded-[10px] px-1 text-[0.76rem] font-medium text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <RoleBadge
              disabled={isPending}
              onClick={handleRoleEditStart}
              role={user.role}
            />
          )}
        </div>
      </td>

      <td className="px-4 py-3">
        <StatusBadge isActive={user.isActive} />
      </td>

      <td className="px-4 py-3">
        <div className="w-[215px] space-y-1.5">
          <button
            type="button"
            disabled={isPending || user.isProtectedLastActiveAdmin}
            onClick={handleToggleActive}
            className={`inline-flex h-[2.125rem] w-auto items-center justify-center rounded-[8px] border bg-white px-3 text-[0.76rem] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              user.isActive
                ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            {isPending
              ? "Сохраняем..."
              : user.isActive
                ? "Деактивировать"
                : "Активировать"}
          </button>

          {user.isProtectedLastActiveAdmin ? (
            <p className="max-w-[200px] text-[0.69rem] leading-4 text-slate-500">
              Последнего активного администратора нельзя понизить или деактивировать.
            </p>
          ) : null}

          {message ? (
            <p className="text-[0.72rem] leading-4 text-slate-500">{message}</p>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function UsersAdminPanel({ users }: UsersAdminPanelProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-[var(--radius-default)] border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-[0.95rem] text-slate-500">
        Пользователи пока не найдены.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="border-b border-slate-200/90 bg-slate-100">
              <tr>
                <th className="px-3.5 py-2 text-left text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Пользователь
                </th>
                <th className="px-3.5 py-2 text-left text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Роль
                </th>
                <th className="px-3.5 py-2 text-left text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Статус
                </th>
                <th className="px-3.5 py-2 text-left text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <DesktopUserManagementRow
                  key={`${user.id}:${user.role}:${user.isActive}`}
                  user={user}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <UserManagementRow
            key={`${user.id}:${user.role}:${user.isActive}`}
            user={user}
          />
        ))}
      </div>
    </div>
  );
}
