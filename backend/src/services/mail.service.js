const nodemailer = require('nodemailer');
const { mail, clientOrigin, isProduction } = require('../config/env');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    if (!mail.host) {
      logger.warn('SMTP not configured — emails will be logged, not sent');
      transporter = null;
    } else {
      transporter = nodemailer.createTransport({
        host: mail.host,
        port: mail.port,
        secure: mail.port === 465,
        auth: mail.user ? { user: mail.user, pass: mail.pass } : undefined,
      });
    }
  }
  return transporter;
}

async function send({ to, subject, html, attachments }) {
  const client = getTransporter();
  if (!client) {
    if (!isProduction) logger.info('Email (dev, not sent)', { to, subject, html, attachmentCount: attachments?.length || 0 });
    return;
  }
  await client.sendMail({ from: mail.from, to, subject, html, attachments });
}

function sendOtpEmail(to, code) {
  return send({
    to,
    subject: 'Your FMB ERP verification code',
    html: `<p>Your one-time code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
  });
}

function sendPasswordResetEmail(to, token) {
  const link = `${clientOrigin}/reset-password?token=${encodeURIComponent(token)}`;
  return send({
    to,
    subject: 'Reset your FMB ERP password',
    html: `<p>Click <a href="${link}">here</a> to reset your password. This link expires in 30 minutes.</p>`,
  });
}

function sendPurchaseOrderEmail(to, poNumber, pdfBuffer) {
  return send({
    to,
    subject: `Purchase Order ${poNumber} — FMB Nagpur`,
    html: `<p>Please find attached Purchase Order <strong>${poNumber}</strong>.</p>`,
    attachments: [{ filename: `${poNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
  });
}

function sendPaymentAdviceEmail(to, voucherNumber, pdfBuffer) {
  return send({
    to,
    subject: `Payment Advice — Voucher ${voucherNumber} — FMB Nagpur`,
    html: `<p>Please find attached the payment advice for voucher <strong>${voucherNumber}</strong>.</p>`,
    attachments: [{ filename: `${voucherNumber}-payment-advice.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
  });
}

module.exports = { send, sendOtpEmail, sendPasswordResetEmail, sendPurchaseOrderEmail, sendPaymentAdviceEmail };
