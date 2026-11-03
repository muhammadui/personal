/**
 * Transactional email. Resend in production; console in development and tests.
 * Copy rules (docs/auth.md): code first, one line on purpose and expiry, an ignore line,
 * the domain. Always a text part. No emojis.
 */
export type EmailMessage = { to: string; subject: string; text: string; html: string }
export type EmailSender = { send(message: EmailMessage): Promise<void> }

export const FROM_ADDRESS = "Personal <no-reply@notes.muhammadbniu.com>"

export function createEmailSender(resendApiKey: string | undefined, log: (m: string) => void = console.log): EmailSender {
  if (!resendApiKey) {
    return {
      async send(m) {
        log(`[email] to=${m.to} subject="${m.subject}"\n${m.text}`)
      },
    }
  }
  return {
    async send(m) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_ADDRESS, to: [m.to], subject: m.subject, text: m.text, html: m.html }),
      })
      if (!res.ok) throw new Error(`Email send failed: ${res.status} ${await res.text()}`)
    },
  }
}

export type OtpPurpose = "email-verification" | "forget-password" | "sign-in" | "change-email"

const PURPOSE: Record<OtpPurpose, { subject: string; line: string }> = {
  "email-verification": { subject: "verification code", line: "Enter it in the app to confirm your email address." },
  "forget-password": { subject: "password reset code", line: "Enter it in the app to choose a new password." },
  "sign-in": { subject: "sign-in code", line: "Enter it in the app to sign in." },
  "change-email": { subject: "verification code", line: "Enter it in the app to confirm your new email address." },
}

export function otpEmail(to: string, otp: string, purpose: OtpPurpose, appUrl: string): EmailMessage {
  const p = PURPOSE[purpose]
  const spaced = otp.length === 6 ? `${otp.slice(0, 3)} ${otp.slice(3)}` : otp
  const host = new URL(appUrl).host
  const text = `Your Personal ${p.subject} is ${spaced}

${p.line} The code expires in 10 minutes.

If you didn't request this, you can ignore this email.

Personal
${appUrl}`
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f6f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e6e6e1;border-radius:8px;">
<tr><td style="padding:32px 32px 8px 32px;font-family:${font};font-size:15px;font-weight:600;color:#111111;">Personal</td></tr>
<tr><td style="padding:8px 32px 0 32px;font-family:${font};font-size:15px;line-height:22px;color:#333333;">Your ${p.subject}:</td></tr>
<tr><td style="padding:12px 32px 4px 32px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:30px;letter-spacing:4px;color:#111111;">${spaced}</td></tr>
<tr><td style="padding:12px 32px 28px 32px;font-family:${font};font-size:14px;line-height:21px;color:#555555;">${p.line} The code expires in 10 minutes.</td></tr>
<tr><td style="padding:16px 32px 28px 32px;border-top:1px solid #eeeeea;font-family:${font};font-size:12px;line-height:18px;color:#888888;">If you didn't request this, you can ignore this email.<br>${host}</td></tr>
</table></td></tr></table></body></html>`
  return { to, subject: `${otp} is your Personal ${p.subject}`, text, html }
}
