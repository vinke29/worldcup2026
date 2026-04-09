"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactMessage(
  _prevState: { ok: true } | { ok: false; error: string } | null,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string).trim();
  const message = (formData.get("message") as string).trim();

  if (!name || !email || !message) {
    return { ok: false, error: "All fields are required." };
  }

  const { error } = await resend.emails.send({
    from: "Quiniela Contact <noreply@quinielatikitaka.com>",
    to: "hello@quinielatikitaka.com",
    replyTo: email,
    subject: `Message from ${name}`,
    html: `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap">${message}</p>
    `.trim(),
  });

  if (error) return { ok: false, error: "Failed to send. Please try again." };
  return { ok: true };
}
