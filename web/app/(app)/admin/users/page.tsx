import { requireAdminViewer } from "@/src/auth/current-viewer";
import { countActiveAdminProfiles, listProfilesForAdmin } from "@/src/db/queries";
import { UsersAdminPanel } from "./_components/users-admin-panel";

export default async function AdminUsersPage() {
  const viewer = await requireAdminViewer();
  const [users, activeAdminCount] = await Promise.all([
    listProfilesForAdmin(),
    countActiveAdminProfiles(),
  ]);

  return (
    <div className="md:mx-auto md:max-w-[860px]">
      <div className="space-y-4 md:space-y-5">
        <section className="hidden space-y-1 md:block">
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-950">
            Администрирование пользователей
          </h1>
        </section>

        <UsersAdminPanel
          users={users.map((user) => ({
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            isCurrentViewer: user.id === viewer.profileId,
            isProtectedLastActiveAdmin:
              activeAdminCount === 1 && user.role === "admin" && user.isActive,
          }))}
        />
      </div>
    </div>
  );
}
