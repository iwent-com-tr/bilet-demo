const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Iwent" <noreply@iwent.com>',
      to,
      subject,
      html
    });
    return info;
  } catch (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

const sendTicketEmail = async ({ to, eventName, ticketType, qrCodeUrl }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Iwent - Biletiniz Hazır!</h1>
      <p>Sayın Müşterimiz,</p>
      <p><strong>${eventName}</strong> etkinliği için <strong>${ticketType}</strong> biletiniz hazır.</p>
      <div style="text-align: center; margin: 20px 0;">
        <img src="${qrCodeUrl}" alt="QR Kod" style="max-width: 200px;"/>
      </div>
      <p>Etkinliğe girerken bu QR kodu göstermeniz gerekecektir.</p>
      <p>İyi eğlenceler dileriz!</p>
      <hr/>
      <p style="font-size: 12px; color: #666;">
        Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `${eventName} - Biletiniz Hazır!`,
    html
  });
};

module.exports = { sendEmail, sendTicketEmail }; 