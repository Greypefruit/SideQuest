import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getProfileById } from "@/src/db/queries";
import { getCurrentSession, type SessionPayload } from "./session";
import { normalizeAuthEmail } from "./validation";

export type AuthenticatedViewer = {
  profileId: string;
  authUserId: string;
  email: string;
  displayName: string;
  role: "player" | "organizer" | "admin";
};

function isSessionValidForProfile(
  session: SessionPayload,
  profile: Awaited<ReturnType<typeof getProfileById>>,
) {
  if (!profile) {
    return false;
  }

  return (
    profile.isActive &&
    profile.id === session.profileId &&
    profile.authUserId === session.authUserId &&
    normalizeAuthEmail(profile.email) === normalizeAuthEmail(session.email)
  );
}

export const getCurrentViewer = cache(async (): Promise<AuthenticatedViewer | null> => {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const profile = await getProfileById(session.profileId);

  if (!isSessionValidForProfile(session, profile)) {
    return null;
  }

  return {
    profileId: profile.id,
    authUserId: profile.authUserId,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
  };
});

export async function requireCurrentViewer() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect("/");
  }

  return viewer;
}

export async function requireAdminViewer() {
  const viewer = await requireCurrentViewer();

  if (viewer.role !== "admin") {
    redirect("/");
  }

  return viewer;
}
