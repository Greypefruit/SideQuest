import "server-only";

export async function sendOtpEmail(email: string, code: string) {
  console.info(`[SideQuest OTP] ${email}: ${code}`);
}
