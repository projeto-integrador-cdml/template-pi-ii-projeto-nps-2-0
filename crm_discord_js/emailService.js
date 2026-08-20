import nodemailer from 'nodemailer';

export async function sendPasswordResetEmail(toEmail, code) {
  let gmailUser = process.env.GMAIL_USER?.trim() || '';
  let gmailPass = process.env.GMAIL_PASS?.trim() || '';

  // Se o usuário não incluiu o @gmail.com, adiciona automaticamente
  if (gmailUser && !gmailUser.includes('@')) {
    gmailUser = `${gmailUser}@gmail.com`;
  }

  // Remove espaços da senha de app se houver (ex: 'lghv gijt ubfq ebpn' -> 'lghvgijtubfqebpn')
  if (gmailPass) {
    gmailPass = gmailPass.replace(/\s+/g, '');
  }

  if (!gmailUser || !gmailPass) {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('[Email Service - MODO SIMULADO / SEM CONFIG]');
    console.log(`Para: ${toEmail}`);
    console.log(`Código de Redefinição: ${code} (válido por 15 minutos)`);
    console.log('Configure GMAIL_USER e GMAIL_PASS no .env para enviar via Gmail SMTP real.');
    console.log('══════════════════════════════════════════════════════════════');
    return {
      success: true,
      simulated: true,
      message: `Modo simulado: configure GMAIL_USER e GMAIL_PASS no .env da host. Seu código é: ${code}`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
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

    console.log(`[Email Service] ✉️ E-mail enviado com sucesso para ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Service] ❌ Erro ao enviar e-mail via Gmail SMTP:', error.message);
    console.log(`[Email Service] ℹ️ Código gerado para ${toEmail}: ${code}`);
    return {
      success: true,
      simulated: true,
      message: `Erro no SMTP do Gmail (${error.message}). Código de recuperação gerado: ${code}`,
    };
  }
}
