import { Resend } from "resend";
import { config } from "./config";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    if (!config.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resend = new Resend(config.RESEND_API_KEY);
  }
  return resend;
}

export function isEmailConfigured(): boolean {
  return !!config.RESEND_API_KEY;
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  origin: string,
): Promise<void> {
  const resetUrl = `${origin}/reset-password?token=${resetToken}`;
  const r = getResend();

  await r.emails.send({
    from: "Walkable <noreply@walkable.app>",
    to,
    subject: "Reset your Walkable password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested a password reset for your Walkable account.</p>
        <p>Click the link below to set a new password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
