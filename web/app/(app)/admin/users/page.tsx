import { PagePlaceholder } from "../../../_components/page-placeholder";
import { requireAdminViewer } from "@/src/auth/current-viewer";

export default async function AdminUsersPage() {
  await requireAdminViewer();

  return (
    <PagePlaceholder
      title="Администрирование пользователей"
      description="Этот раздел виден только администраторам и уже защищен от прямого доступа по URL для остальных ролей. Полный сценарий управления пользователями будет добавлен на отдельном этапе Release 1."
      details={[
        { label: "Доступ", value: "Только Admin" },
        { label: "Секция", value: "Пользователи" },
        { label: "Состояние", value: "Маршрут защищен" },
      ]}
    />
  );
}
