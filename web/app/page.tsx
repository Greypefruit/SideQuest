import { AuthFlow } from "./_components/auth-flow";
import { AppShell } from "./_components/app-shell";
import { PagePlaceholder } from "./_components/page-placeholder";
import { getCurrentViewer } from "@/src/auth/current-viewer";

export default async function Home() {
  const viewer = await getCurrentViewer();

  if (viewer) {
    return (
      <AppShell viewer={viewer}>
        <PagePlaceholder
          title="Главная"
          description="Главная страница уже открывается внутри signed-in оболочки приложения и использует общий visual system Release 1. Обзорные блоки и продуктовые данные будут добавлены позже без смены текущей структуры shell."
          details={[
            { label: "Активность", value: "Настольный теннис" },
            { label: "Доступ", value: "Player, Organizer, Admin" },
            { label: "Состояние", value: "Базовый shell готов" },
          ]}
        />
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
