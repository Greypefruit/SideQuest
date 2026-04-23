import { PagePlaceholder } from "../../_components/page-placeholder";

export default function MatchesPage() {
  return (
    <PagePlaceholder
      title="Матчи"
      description="Раздел обычных матчей уже доступен в навигации и открывается только после входа. Наполнение списком матчей и сценариями записи результата будет добавлено отдельным этапом Release 1."
      details={[
        { label: "Активность", value: "Настольный теннис" },
        { label: "Доступ", value: "Player, Organizer, Admin" },
        { label: "Состояние", value: "Маршрут и оболочка готовы" },
      ]}
    />
  );
}
