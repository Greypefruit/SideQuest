import { AuthFlow } from "./_components/auth-flow";
import { getCurrentSession } from "@/src/auth/session";

export default async function Home() {
  const session = await getCurrentSession();

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-5 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col items-center justify-center gap-4 sm:min-h-[calc(100vh-6rem)] sm:gap-8">
        <div className="text-center text-slate-950">
          <span className="text-[2rem] font-semibold tracking-tight">SideQuest</span>
        </div>

        {session ? (
          <section className="w-full max-w-[24rem] rounded-[28px] border border-slate-200/80 bg-white p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="mx-auto w-full max-w-[18.5rem]">
              <div className="space-y-3">
                <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-950">
                  Вход выполнен
                </h1>
                <p className="text-sm leading-6 text-slate-600">
                  Вход выполнен успешно. Сессия активна для {session.email}.
                </p>
              </div>

              <form action="/api/auth/logout" method="post" className="mt-6">
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-900 transition hover:border-blue-200 hover:text-blue-700"
                >
                  Выйти
                </button>
              </form>
            </div>
          </section>
        ) : (
          <AuthFlow />
        )}
      </div>
    </main>
  );
}
