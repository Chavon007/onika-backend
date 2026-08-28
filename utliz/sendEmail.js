import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    psassword: process.env.password,
  },
});

const sendOtpEmail = async (to, otp) => {
  const html = `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0F6E5E;">Verify your email</h2>
      <p>Use the code below to verify your account. It expires in 5 minutes.</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">
        ${otp}
      </div>
      <p style="color: #888; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
    </div>`;

  await transporter.sendMail({
    from: `"Onika" <${process.env.SMTP_FROM}>`,
    to,
    subject: "Your verification code",
    html,
  });
};

export default sendOtpEmail;
