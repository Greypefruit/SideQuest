import { AuthFlow } from "./_components/auth-flow";
import { getCurrentSession } from "@/src/auth/session";

export default async function Home() {
  const session = await getCurrentSession();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-4 py-10">
      {session ? (
        <section className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-6 shadow-lg shadow-emerald-100/80 sm:p-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-950">Вы вошли в SideQuest</h1>
            <p className="text-sm leading-6 text-slate-600">
              Сессия создана, а автоматическое создание пользователя Release 1 работает.
            </p>
          </div>

          <dl className="mt-6 space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="font-medium text-slate-500">Email</dt>
              <dd className="mt-1">{session.email}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="font-medium text-slate-500">Роль</dt>
              <dd className="mt-1">{session.role}</dd>
            </div>
          </dl>

          <form action="/api/auth/logout" method="post" className="mt-6">
            <button
              type="submit"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-900"
            >
              Выйти
            </button>
          </form>
        </section>
      ) : (
        <AuthFlow />
      )}
    </main>
  );
}
