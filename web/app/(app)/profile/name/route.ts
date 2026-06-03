import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/src/auth/current-viewer";
import { updateProfile } from "@/src/db/queries";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 120;

function buildDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const formData = await request.formData();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();

  if (!firstName || !lastName) {
    return NextResponse.redirect(new URL("/profile?error=required", request.url), 303);
  }

  const displayName = buildDisplayName(firstName, lastName);

  if (
    firstName.length > MAX_NAME_LENGTH ||
    lastName.length > MAX_NAME_LENGTH ||
    displayName.length > MAX_NAME_LENGTH
  ) {
    return NextResponse.redirect(new URL("/profile?error=too_long", request.url), 303);
  }

  await updateProfile(viewer.profileId, {
    firstName,
    lastName,
    displayName,
  });

  return NextResponse.redirect(new URL("/profile?saved=1", request.url), 303);
}
