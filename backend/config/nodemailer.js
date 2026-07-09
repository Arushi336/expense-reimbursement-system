import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const isSmtpConfigured = process.env.SMTP_HOST && 
                          process.env.SMTP_PORT && 
                          process.env.SMTP_USER && 
                          process.env.SMTP_PASS;

  if (!isSmtpConfigured) {
    console.log('----------------------------------------------------');
    console.log(`[DEV EMAIL SIMULATOR]`);
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: ${options.message}`);
    console.log('----------------------------------------------------');
    return { success: true, message: 'Email logged in simulator console' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'EERS Notification'}" <${process.env.SMTP_FROM_EMAIL || 'no-reply@company.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${options.message}</p>`,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`Email dispatched: ${info.messageId}`);
  return info;
};

export default sendEmail;
