import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(toEmail: string, code: string): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (!gmailUser || !gmailPass) {
    console.log("══════════════════════════════════════════════════════════════");
    console.log(`[Email Service - SIMULATED MODE]`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: Código de Redefinição de Senha: ${code}`);
    console.log(`Code: ${code} (válido por 15 minutos)`);
    console.log("══════════════════════════════════════════════════════════════");
    return {
      success: true,
      simulated: true,
      message: "Modo simulado: GMAIL_USER/GMAIL_PASS não configurados no .env. Código exibido no console.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #1f2937; text-align: center; margin-bottom: 20px;">Redefinição de Senha</h2>
        <p style="color: #4b5563; font-size: 15px;">Olá,</p>
        <p style="color: #4b5563; font-size: 15px;">Você solicitou a redefinição de senha para a sua conta no CRM. Use o código abaixo para prosseguir:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb; background-color: #eff6ff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #2563eb; display: inline-block;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">Este código é válido por <strong>15 minutos</strong>. Se você não solicitou esta alteração, ignore este e-mail.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">CRM Sistema de Gestão — Não responda a este e-mail.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"CRM Suporte" <${gmailUser}>`,
      to: toEmail,
      subject: `Seu código de redefinição de senha: ${code}`,
      html: htmlContent,
    });

    console.log(`[Email Service] E-mail de redefinição de senha enviado com sucesso para ${toEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Email Service] Erro ao enviar e-mail via Gmail SMTP:`, error);
    throw new Error(`Falha ao enviar e-mail via Gmail SMTP: ${error.message || error}`);
  }
}
