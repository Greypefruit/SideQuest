import type { ReactNode } from "react";
import { AppShell } from "../_components/app-shell";
import { requireCurrentViewer } from "@/src/auth/current-viewer";

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await requireCurrentViewer();

  return <AppShell viewer={viewer}>{children}</AppShell>;
}
