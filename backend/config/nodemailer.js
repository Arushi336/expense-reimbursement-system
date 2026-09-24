import './env.js';
import nodemailer from 'nodemailer';

let transporterInstance = null;
let lastUser = null;
let lastPass = null;

/**
 * Creates or retrieves the Nodemailer transporter, refreshing if credentials change.
 */
export const getTransporter = (forceRefresh = false) => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const isSecure = port === 465; // Port 587 uses STARTTLS (secure: false)
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  if (transporterInstance && !forceRefresh && lastUser === user && lastPass === pass) {
    return transporterInstance;
  }

  transporterInstance = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    // Port 587 negotiates STARTTLS automatically when secure is false
  });

  lastUser = user;
  lastPass = pass;
  return transporterInstance;
};

/**
 * Formats Nodemailer / SMTP errors with actionable diagnostics
 * while ensuring no credentials or passwords are ever exposed.
 */
export const formatSmtpError = (error) => {
  const code = error?.code || 'UNKNOWN';
  const message = error?.message || 'Unknown SMTP error';
  const response = error?.response || '';

  const isAuthError = code === 'EAUTH' || response.includes('535') || message.toLowerCase().includes('username and password not accepted');

  let diagnostic = `SMTP Error [${code}]: ${message}`;
  if (response) {
    diagnostic += `\nSMTP Server Response: ${response}`;
  }

  if (isAuthError) {
    diagnostic += `\n\nLikely causes for Gmail SMTP Authentication Failure (EAUTH / 535-5.7.8):
  1. Wrong Gmail address configured in SMTP_USER.
  2. Incorrect App Password in SMTP_PASS (Must use a 16-character Google App Password, NOT your regular Google account password).
  3. App Password copied with extraneous leading or trailing whitespace.
  4. 2-Step Verification is not enabled on your Google Account (required for App Passwords).
  5. Account/domain security policy or Google Workspace policy preventing standard SMTP access.`;
  }

  return {
    code,
    message,
    response,
    isAuthError,
    diagnostic,
  };
};

/**
 * Safe startup verification check for SMTP connection.
 * Logs only safe configuration details (NO passwords or tokens).
 */
export const verifySmtpConnection = async () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.log('----------------------------------------------------');
    console.log('SMTP configuration: Incomplete (Running in DEV EMAIL SIMULATOR mode)');
    console.log('To send real emails, set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env');
    console.log('----------------------------------------------------');
    return { success: false, mode: 'simulator' };
  }

  console.log('SMTP configuration detected');
  console.log(`SMTP host: ${host}`);
  console.log(`SMTP port: ${port}`);
  console.log(`SMTP user: configured`);

  const transporter = getTransporter();
  try {
    await transporter.verify();
    console.log('SMTP connection: successful');
    return { success: true, mode: 'live' };
  } catch (error) {
    const formatted = formatSmtpError(error);
    console.error('SMTP connection: failed');
    console.error(`SMTP error code: ${formatted.code}`);
    console.error(`SMTP error message: ${formatted.message}`);
    if (formatted.isAuthError) {
      console.error(formatted.diagnostic);
    }
    return { success: false, mode: 'failed', error: formatted };
  }
};

/**
 * Send an email using configured Nodemailer transporter or simulator
 * @param {Object} options - { email, subject, message, html }
 */
const sendEmail = async (options) => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Simulator mode fallback if SMTP credentials not provided
  if (!user || !pass) {
    console.log('----------------------------------------------------');
    console.log(`[DEV EMAIL SIMULATOR] (No SMTP credentials configured in .env)`);
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message:\n${options.message}`);
    console.log('To send real emails to your inbox, configure SMTP_USER & SMTP_PASS in .env');
    console.log('----------------------------------------------------');
    return { success: true, message: 'Email logged in simulator console' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('SMTP transporter is not initialized.');
  }

  const fromName = process.env.SMTP_FROM_NAME || 'EERS Notification';
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${options.message}</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email dispatched successfully to ${options.email}: ${info.messageId}`);
    return info;
  } catch (error) {
    const formatted = formatSmtpError(error);
    if (formatted.isAuthError) {
      transporterInstance = null; // Invalidate cached transporter on auth error
    }
    console.error('Email dispatch failed:');
    console.error(`Code: ${formatted.code}`);
    console.error(`Message: ${formatted.message}`);
    if (formatted.isAuthError) {
      console.error(formatted.diagnostic);
    }
    throw error;
  }
};

export default sendEmail;
