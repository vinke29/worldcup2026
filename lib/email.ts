import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Quiniela <noreply@quinielatikitaka.com>";

export async function sendWelcomeEmail(email: string, name: string) {
  const firstName = name.split(" ")[0];

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to Quiniela ⚽",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0B1E0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1E0D;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#D7FF5A;border-radius:10px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                    <span style="font-weight:900;font-size:14px;color:#0B1E0D;line-height:32px;">Q</span>
                  </td>
                  <td style="padding-left:8px;">
                    <span style="font-weight:900;font-size:16px;color:#F0EDE6;letter-spacing:-0.5px;">quiniel<span style="color:#D7FF5A;">a</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1A2E1F;border:1px solid #2C4832;border-radius:20px;padding:40px 36px;">

              <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#F0EDE6;letter-spacing:-0.5px;">
                Welcome, ${firstName}! ⚽
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#7A9B84;line-height:1.6;">
                Your account is confirmed. You're all set to play Quiniela — the World Cup 2026 prediction game.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
                <tr>
                  <td style="padding:14px 16px;background:#0F2411;border:1px solid #2C4832;border-radius:12px;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#4A6B50;">What's next</p>
                    <p style="margin:0;font-size:13px;color:#B3C9B7;line-height:1.5;">
                      Create or join a private league, make your predictions, and climb the leaderboard.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#D7FF5A;border-radius:12px;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielatikitaka.com"}"
                       style="display:inline-block;padding:13px 28px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#0B1E0D;text-decoration:none;">
                      Go to my league →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#2C4832;">
                You're receiving this because you signed up at quinielatikitaka.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}
