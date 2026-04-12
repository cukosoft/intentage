import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

const LOCAL_AUDIT_FILE = path.join(process.cwd(), 'subscribers.json');
const RESEND_API_URL = 'https://api.resend.com/emails';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

function getNotifyRecipients() {
  const raw = process.env.SUBSCRIBE_NOTIFY_TO ?? '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function saveLocalAudit(email: string) {
  try {
    const existing = fs.existsSync(LOCAL_AUDIT_FILE)
      ? JSON.parse(fs.readFileSync(LOCAL_AUDIT_FILE, 'utf-8'))
      : [];

    if (!Array.isArray(existing)) {
      return;
    }

    if (!existing.includes(email)) {
      existing.push(email);
      fs.writeFileSync(LOCAL_AUDIT_FILE, JSON.stringify(existing, null, 2));
    }
  } catch (error) {
    console.error('Failed to update local subscriber audit', error);
  }
}

async function sendResendNotification(email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = getNotifyRecipients();
  const fromEmail = process.env.SUBSCRIBE_FROM_EMAIL;
  const fromName = process.env.SUBSCRIBE_FROM_NAME || 'Intent Age';

  if (!apiKey || !fromEmail || recipients.length === 0) {
    return false;
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: recipients,
      reply_to: email,
      subject: 'New Intent Age subscriber',
      text: `A new subscriber joined Intent Age.\n\nEmail: ${email}\nSource: website`,
      html: `
        <div style="font-family: Georgia, serif; line-height: 1.6; color: #111;">
          <p style="margin: 0 0 12px;">A new subscriber joined Intent Age.</p>
          <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 8px 0 0; color: #666;">Source: website</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed: ${response.status} ${body}`);
  }

  return true;
}

async function sendTelegramNotification(email: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return false;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: `New Intent Age subscriber:\n${email}`,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram failed: ${response.status} ${body}`);
  }

  return true;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (typeof email !== 'string' || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    saveLocalAudit(email);

    const channels = await Promise.all([
      sendResendNotification(email),
      sendTelegramNotification(email),
    ]);

    const notified = channels.some(Boolean);

    if (!notified && isProduction()) {
      return new Response(
        JSON.stringify({
          error: 'Subscription notifications are not configured yet.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true, notified }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
