"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { AuthenticatedViewer } from "@/src/auth/current-viewer";

type AppShellProps = {
  viewer: AuthenticatedViewer;
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: (props: { active: boolean }) => ReactNode;
};

const primaryNavItems: NavItem[] = [
  {
    href: "/",
    label: "Главная",
    icon: HomeIcon,
  },
  {
    href: "/matches",
    label: "Матчи",
    icon: MatchIcon,
  },
  {
    href: "/tournaments",
    label: "Турниры",
    icon: TrophyIcon,
  },
  {
    href: "/ranking",
    label: "Рейтинг",
    icon: RankingIcon,
  },
  {
    href: "/profile",
    label: "Профиль",
    icon: ProfileIcon,
  },
];

const adminNavItem: NavItem = {
  href: "/admin/users",
  label: "Пользователи",
  icon: AdminIcon,
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageTitle(pathname: string, viewport: "mobile" | "desktop") {
  if (pathname === "/") {
    return "Главная";
  }

  if (pathname === "/tournaments/create") {
    return "Создание турнира";
  }

  if (pathname === "/matches") {
    return "Матчи";
  }

  if (pathname === "/tournaments" || pathname.startsWith("/tournaments/")) {
    return "Турниры";
  }

  if (pathname === "/ranking") {
    return "Рейтинг";
  }

  if (pathname === "/profile") {
    return "Профиль";
  }

  if (pathname.startsWith("/admin/users")) {
    return viewport === "mobile" ? "Пользователи" : "Администрирование пользователей";
  }

  return "SideQuest";
}

export function AppShell({ viewer, children }: AppShellProps) {
  const pathname = usePathname();
  const isTournamentDetailPage = /^\/tournaments\/[^/]+$/.test(pathname);
  const desktopNavItems =
    viewer.role === "admin" ? [...primaryNavItems, adminNavItem] : primaryNavItems;
  const mobileAdminAction =
    viewer.role === "admin" && !isActivePath(pathname, adminNavItem.href) ? adminNavItem : null;

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto hidden max-w-6xl items-center gap-8 px-6 py-4 md:flex">
          <Link href="/" className="text-[1.2rem] font-semibold tracking-tight text-slate-950">
            SideQuest
          </Link>

          <nav className="flex items-center gap-1" aria-label="Основная навигация">
              {desktopNavItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[var(--radius-default)] px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className={`mx-auto max-w-6xl items-center justify-between gap-4 px-4 py-4 md:hidden ${
            isTournamentDetailPage ? "hidden" : "flex"
          }`}
        >
          <div className="min-w-0">
            <p className="truncate text-[1.75rem] font-semibold tracking-tight text-slate-950">
              {getPageTitle(pathname, "mobile")}
            </p>
          </div>

          {mobileAdminAction ? (
            <Link
              href={mobileAdminAction.href}
              className="shrink-0 rounded-[var(--radius-default)] border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
            >
              {mobileAdminAction.label}
            </Link>
          ) : null}
        </div>
      </header>

      <main
        className={`mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-6xl flex-col md:px-6 md:py-8 md:pb-10 ${
          isTournamentDetailPage ? "px-0 py-0 pb-0" : "px-4 py-6 pb-28"
        }`}
      >
        {children}
      </main>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur md:hidden ${
          isTournamentDetailPage ? "hidden" : "block"
        }`}
      >
        <nav
          aria-label="Нижняя навигация"
          className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2"
        >
          {primaryNavItems.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-[var(--radius-default)] px-2 py-2 text-center text-[0.7rem] font-medium transition ${
                  isActive
                    ? "text-blue-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`h-0.5 w-8 rounded-[var(--radius-default)] ${
                    isActive ? "bg-blue-600" : "bg-transparent"
                  }`}
                  aria-hidden="true"
                />
                <span aria-hidden="true">{item.icon({ active: isActive })}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function iconClassName(active: boolean) {
  return active ? "text-blue-600" : "text-slate-400";
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={iconClassName(active)}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
    >
      <path
        d="M3 8.4 10 3l7 5.4V17a1 1 0 0 1-1 1h-4.2v-4.8H8.2V18H4a1 1 0 0 1-1-1V8.4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function MatchIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={iconClassName(active)}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
    >
      <path
        d="M7.5 5.5H15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M7.5 10H15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M7.5 14.5H15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="4.5" cy="5.5" r="1" fill="currentColor" />
      <circle cx="4.5" cy="10" r="1" fill="currentColor" />
      <circle cx="4.5" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={iconClassName(active)}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
    >
      <path
        d="M6 3.5h8v2.3a4 4 0 0 1-3 3.9V13h2.6v2H6.4v-2H9V9.7A4 4 0 0 1 6 5.8V3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M6 5H3.5A2.5 2.5 0 0 0 6 7.5M14 5h2.5A2.5 2.5 0 0 1 14 7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function RankingIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={iconClassName(active)}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
    >
      <path
        d="M4 17V8.5h3V17M8.5 17V4h3v13M13 17v-6h3v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={iconClassName(active)}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
    >
      <path
        d="M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 16.2c1.3-2 3.4-3.2 6-3.2s4.7 1.2 6 3.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function AdminIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={iconClassName(active)}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
    >
      <path
        d="M10 3.5 15.5 6v4.2c0 3-2 5.7-5.5 6.8-3.5-1.1-5.5-3.8-5.5-6.8V6L10 3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M8.2 10.1 9.5 11.4l2.6-2.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
