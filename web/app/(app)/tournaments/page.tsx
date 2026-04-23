import { PagePlaceholder } from "../../_components/page-placeholder";

export default function TournamentsPage() {
  return (
    <PagePlaceholder
      title="Турниры"
      description="Раздел турниров встроен в общий shell и готов для дальнейшего наполнения. Список турниров, создание и управление будут подключены в следующих задачах Release 1."
      details={[
        { label: "Активность", value: "Настольный теннис" },
        { label: "Доступ", value: "Player, Organizer, Admin" },
        { label: "Состояние", value: "Навигация и маршрут готовы" },
      ]}
    />
  );
}
