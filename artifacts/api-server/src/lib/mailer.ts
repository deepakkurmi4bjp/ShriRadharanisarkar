import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendOtpEmail(toEmail: string, otp: string, name: string): Promise<void> {
  await transporter.sendMail({
    from: `"श्री मां नर्मदा भक्त परिवार" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Login OTP — दान प्रबंधन प्रणाली",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: #c2410c; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">श्री मां नर्मदा भक्त परिवार</h2>
          <p style="color: #fed7aa; margin: 4px 0 0;">दान प्रबंधन प्रणाली</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 8px;">नमस्ते <strong>${name}</strong>,</p>
          <p style="color: #6b7280; margin: 0 0 20px;">आपका Login OTP नीचे दिया गया है। यह <strong>10 मिनट</strong> तक वैध है।</p>
          <div style="background: #fff7ed; border: 2px dashed #c2410c; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 20px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #c2410c;">${otp}</span>
          </div>
          <p style="color: #9ca3af; font-size: 13px; margin: 0;">यदि आपने login करने की कोशिश नहीं की, तो इस email को नजरअंदाज करें।</p>
        </div>
      </div>
    `,
  });
}
