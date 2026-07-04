import { storagePut } from "./storage";

interface SendQuotationEmailParams {
  to: string;
  quotation: any;
  company: any;
  pdfBuffer: Buffer;
  message?: string;
}

export async function sendQuotationEmail({ to, quotation, company, pdfBuffer, message }: SendQuotationEmailParams) {
  // Upload PDF to S3 first
  const fileName = `orcamento-${quotation.number.replace("/", "-")}.pdf`;
  const fileKey = `quotations/${quotation.id}/${fileName}`;
  const { url: pdfUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");

  // Send email via built-in notification API
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Email service not configured");
  }

  const companyName = company?.nomeFantasia || company?.razaoSocial || "Financeiro";
  const subject = `Orçamento #${quotation.number} - ${companyName}`;
  const body = message || `Olá${quotation.clientName ? ` ${quotation.clientName}` : ""},\n\nSegue em anexo o orçamento #${quotation.number}.\n\nQualquer dúvida, estou à disposição.\n\nAtenciosamente,\n${companyName}`;

  const emailHtml = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #302b63;">Orçamento #${quotation.number}</h2>
      <p style="color: #555; white-space: pre-line;">${body}</p>
      <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <p style="margin: 0;"><strong>Valor Total:</strong> ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(quotation.total))}</p>
        <p style="margin: 5px 0 0;"><strong>Validade:</strong> ${quotation.validityDays || 15} dias</p>
      </div>
      <p style="margin-top: 20px;">
        <a href="${pdfUrl}" style="display: inline-block; padding: 10px 20px; background: #302b63; color: #fff; text-decoration: none; border-radius: 6px;">Baixar PDF do Orçamento</a>
      </p>
      <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 11px; color: #999;">${companyName}${company?.cnpj ? ` | CNPJ: ${company.cnpj}` : ""}${company?.telefone ? ` | ${company.telefone}` : ""}</p>
    </div>
  `;

  // Use the notification API to send email
  const response = await fetch(`${baseUrl}/v1/notification/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to,
      subject,
      html: emailHtml,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[QuotationEmail] Failed to send:", err);
    throw new Error("Falha ao enviar email");
  }

  return { pdfUrl };
}
