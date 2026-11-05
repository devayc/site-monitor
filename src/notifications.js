const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      }
    : undefined,
});

async function sendEmail(to, subject, text) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('SMTP не настроен, пропускаем отправку email');
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text,
    });
    console.log(`Email отправлен: ${to}`);
    return true;
  } catch (err) {
    console.error('Ошибка отправки email:', err.message);
    return false;
  }
}

async function sendStatusNotification(site, previousStatus, newStatus, error) {
  if (!site.notify_emails) return;

  const emails = site.notify_emails
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (emails.length === 0) return;

  const statusText = newStatus === site.expected_status ? 'UP' : 'DOWN';
  const prevText = previousStatus === site.expected_status ? 'UP' : 'DOWN';

  const subject = `[Site Monitor] ${site.name} — статус изменился на ${statusText}`;
  const body = `Сайт: ${site.name}
URL: ${site.url}

Предыдущий статус: ${previousStatus} (${prevText})
Новый статус: ${newStatus || 'Ошибка'} (${statusText})

Время проверки: ${new Date().toLocaleString('ru-RU')}
Время ответа: ${site.last_response_time || '—'} мс
Ошибка: ${error || 'Нет'}

---
Site Monitor`;

  await sendEmail(emails, subject, body);
}

module.exports = { sendEmail, sendStatusNotification };
