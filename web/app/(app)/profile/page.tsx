import { PagePlaceholder } from "../../_components/page-placeholder";

export default function ProfilePage() {
  return (
    <PagePlaceholder
      title="Профиль"
      description="Профиль уже доступен как отдельный root-раздел внутри signed-in приложения. Наполнение персональными данными и статистикой будет выполнено следующим этапом, а сейчас здесь остается базовая точка выхода из системы."
      details={[
        { label: "Активность", value: "Настольный теннис" },
        { label: "Доступ", value: "Player, Organizer, Admin" },
        { label: "Состояние", value: "Раздел подготовлен" },
      ]}
    >
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-blue-200 hover:text-blue-700"
        >
          Выйти из системы
        </button>
      </form>
    </PagePlaceholder>
  );
}
