import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/src/auth/current-viewer";
import { updateProfile } from "@/src/db/queries";

export const runtime = "nodejs";

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

  await updateProfile(viewer.profileId, {
    firstName,
    lastName,
    displayName: buildDisplayName(firstName, lastName),
  });

  return NextResponse.redirect(new URL("/profile?saved=1", request.url), 303);
}
