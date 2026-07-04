import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { getTransactions } from "./db";
import { storagePut } from "./storage";
import * as crypto from "crypto";

// Types for extracted document data
export interface ExtractedDocumentData {
  description: string;
  amount: number;
  type: "income" | "expense";
  scope: "pj" | "pf";
  date: number; // timestamp ms
  category?: string;
  fiscalCategory?: string;
  supplier?: string;
  nfNumber?: string;
  confidence: number; // 0-1
}

export interface DuplicateCandidate {
  id: number;
  description: string;
  amount: string;
  date: number;
  type: string;
  scope: string;
  similarity: number; // 0-1
}

/**
 * Upload image to S3 and return the URL
 */
export async function uploadScanImage(
  buffer: Buffer,
  userId: number,
  mimeType: string
): Promise<{ url: string; key: string }> {
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("pdf") ? "pdf" : "jpg";
  const randomSuffix = crypto.randomBytes(8).toString("hex");
  const key = `scans/${userId}/${Date.now()}-${randomSuffix}.${ext}`;
  const result = await storagePut(key, buffer, mimeType);
  return { url: result.url, key };
}

/**
 * Extract financial data from an image using LLM vision
 */
export async function extractDataFromImage(imageUrl: string): Promise<ExtractedDocumentData> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Você é um assistente especializado em extrair dados de documentos financeiros brasileiros.
Analise a imagem e extraia as informações financeiras. Retorne APENAS um JSON válido com os campos:
- description: descrição curta do gasto/receita (string)
- amount: valor numérico (number, sem R$, usar ponto como decimal)
- type: "income" ou "expense" (baseado no tipo de documento)
- scope: "pj" se for nota fiscal de empresa/CNPJ, "pf" se for cupom/recibo pessoal
- date: data no formato ISO (string YYYY-MM-DD), se não encontrar use a data de hoje
- category: categoria sugerida (string: alimentacao, transporte, servicos, equipamentos, software, saude, educacao, moradia, lazer, vestuario, outros)
- fiscalCategory: mesma que category mas em formato do sistema (saude, educacao, moradia, transporte, alimentacao, lazer, vestuario, servicos, equipamentos, software, outros)
- supplier: nome do fornecedor/estabelecimento se visível (string ou null)
- nfNumber: número da nota fiscal se visível (string ou null)
- confidence: confiança na extração de 0 a 1 (number)

Se for uma fatura de cartão com múltiplos itens, extraia apenas o TOTAL da fatura.
Se não conseguir identificar algum campo, use valores padrão razoáveis.
Retorne SOMENTE o JSON, sem markdown, sem explicação.`
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          { type: "text", text: "Extraia os dados financeiros desta imagem." }
        ] as any
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "document_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            amount: { type: "number" },
            type: { type: "string", enum: ["income", "expense"] },
            scope: { type: "string", enum: ["pj", "pf"] },
            date: { type: "string" },
            category: { type: "string" },
            fiscalCategory: { type: "string", enum: ["saude", "educacao", "moradia", "transporte", "alimentacao", "lazer", "vestuario", "servicos", "equipamentos", "software", "outros"] },
            supplier: { type: ["string", "null"] },
            nfNumber: { type: ["string", "null"] },
            confidence: { type: "number" }
          },
          required: ["description", "amount", "type", "scope", "date", "category", "fiscalCategory", "confidence"],
          additionalProperties: false
        }
      }
    }
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : "";
  
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract JSON from markdown code block
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      throw new Error("Não foi possível extrair dados da imagem. Tente com uma foto mais nítida.");
    }
  }

  // Parse date to timestamp
  let dateTimestamp: number;
  try {
    const d = new Date(parsed.date);
    dateTimestamp = d.getTime();
    if (isNaN(dateTimestamp)) dateTimestamp = Date.now();
  } catch {
    dateTimestamp = Date.now();
  }

  return {
    description: parsed.description || "Transação escaneada",
    amount: Math.abs(parsed.amount) || 0,
    type: parsed.type === "income" ? "income" : "expense",
    scope: parsed.scope === "pj" ? "pj" : "pf",
    date: dateTimestamp,
    category: parsed.category || "outros",
    fiscalCategory: parsed.fiscalCategory || "outros",
    supplier: parsed.supplier || undefined,
    nfNumber: parsed.nfNumber || undefined,
    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5))
  };
}

/**
 * Find potential duplicate transactions within a time window
 */
export async function findDuplicates(
  extracted: ExtractedDocumentData,
  userId: number,
  windowDays: number = 45
): Promise<DuplicateCandidate[]> {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const startDate = extracted.date - windowMs;
  const endDate = extracted.date + windowMs;

  const { items } = await getTransactions({
    userId,
    startDate,
    endDate,
    type: extracted.type,
    limit: 200,
  });

  const candidates: DuplicateCandidate[] = [];

  for (const tx of items) {
    const txAmount = parseFloat(String(tx.amount));
    const amountDiff = Math.abs(txAmount - extracted.amount);
    const amountMatch = amountDiff < 0.01; // Exact amount match

    if (!amountMatch) continue;

    // Calculate similarity score
    let similarity = 0.5; // Base score for amount match

    // Date proximity bonus (closer = higher)
    const dateDiff = Math.abs(tx.date - extracted.date);
    const daysDiff = dateDiff / (24 * 60 * 60 * 1000);
    if (daysDiff < 1) similarity += 0.3;
    else if (daysDiff < 3) similarity += 0.2;
    else if (daysDiff < 7) similarity += 0.1;

    // Description similarity bonus
    const descLower = (tx.description || "").toLowerCase();
    const extractedDescLower = extracted.description.toLowerCase();
    const supplierLower = (extracted.supplier || "").toLowerCase();
    
    if (descLower.includes(extractedDescLower) || extractedDescLower.includes(descLower)) {
      similarity += 0.2;
    } else if (supplierLower && descLower.includes(supplierLower)) {
      similarity += 0.15;
    }

    if (similarity >= 0.5) {
      candidates.push({
        id: tx.id,
        description: tx.description,
        amount: String(tx.amount),
        date: tx.date,
        type: tx.type,
        scope: tx.scope,
        similarity: Math.min(1, similarity),
      });
    }
  }

  // Sort by similarity descending
  candidates.sort((a, b) => b.similarity - a.similarity);
  return candidates.slice(0, 5); // Return top 5 matches
}
