import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";

export default async function Home() {
  const allProfiles = await db.select().from(profiles);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">SideQuest</h1>
      <p className="mb-4">Подключение к базе работает.</p>

      <div className="rounded-lg border p-4">
        <p className="font-medium mb-2">Profiles in database: {allProfiles.length}</p>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(allProfiles, null, 2)}
        </pre>
      </div>
    </main>
  );
}
