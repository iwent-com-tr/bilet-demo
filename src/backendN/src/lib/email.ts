import sgMail from '@sendgrid/mail';

function getEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@biletdemo.local';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export type EmailAttachment = {
  filename: string;
  type?: string;
  content: string; // base64 string
  disposition?: string; // 'attachment' | 'inline'
  content_id?: string;
};

export async function sendEmail(params: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not set; email sending is disabled.');
    return;
  }
  const msg: any = {
    to: params.to,
    from: EMAIL_FROM,
    subject: params.subject,
    text: params.text,
    html: params.html,
    attachments: params.attachments,
  };
  await sgMail.send(msg);
}


