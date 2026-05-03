import { AuthFlow } from "./_components/auth-flow";
import { AppShell } from "./_components/app-shell";
import { UserActivityRatingSummary } from "./_components/user-activity-rating-summary";
import { getCurrentViewer } from "@/src/auth/current-viewer";

export default async function Home() {
  const viewer = await getCurrentViewer();

  if (viewer) {
    return (
      <AppShell viewer={viewer}>
        <div className="mx-auto w-full max-w-[1040px] min-w-0 overflow-x-hidden">
          <div className="space-y-3 md:mx-auto md:max-w-[860px] md:space-y-4">
            <header className="hidden md:block">
              <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950">Главная</h1>
              <p className="mt-1 max-w-2xl text-[0.9rem] leading-6 text-slate-500">
                Ключевой обзор по настольному теннису: текущая позиция в рейтинге и базовая
                статистика без перехода в профиль.
              </p>
            </header>

            <UserActivityRatingSummary profileId={viewer.profileId} />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-5 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col items-center justify-center gap-4 sm:min-h-[calc(100vh-6rem)] sm:gap-8">
        <div className="text-center text-slate-950">
          <span className="text-[2rem] font-semibold tracking-tight">SideQuest</span>
        </div>
        <AuthFlow />
      </div>
    </main>
  );
}
