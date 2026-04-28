import { redirect } from "next/navigation";
import { requireCurrentViewer } from "@/src/auth/current-viewer";

export default async function CreateTournamentPage() {
  const viewer = await requireCurrentViewer();

  if (viewer.role !== "organizer" && viewer.role !== "admin") {
    redirect("/tournaments");
  }

  redirect("/tournaments?tab=my&create=1");
}
