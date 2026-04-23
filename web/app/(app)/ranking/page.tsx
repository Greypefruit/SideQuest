import { PagePlaceholder } from "../../_components/page-placeholder";

export default function RankingPage() {
  return (
    <PagePlaceholder
      title="Рейтинг"
      description="Страница рейтинга уже находится внутри защищенной оболочки приложения. Данные рейтинга по текущей активности будут выведены отдельной задачей без изменения навигационной структуры."
      details={[
        { label: "Активность", value: "Настольный теннис" },
        { label: "Доступ", value: "Player, Organizer, Admin" },
        { label: "Состояние", value: "Раздел подготовлен" },
      ]}
    />
  );
}
