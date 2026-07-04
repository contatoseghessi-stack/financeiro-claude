import { describe, expect, it } from "vitest";
import { parseMessage, parseJobMessage, parseCategorizeResponse } from "./telegram-bot";

describe("Telegram Bot - parseMessage", () => {
  it("should parse 'receita PJ 3000 cliente X'", () => {
    const result = parseMessage("receita PJ 3000 cliente X");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("income");
    expect(result!.scope).toBe("pj");
    expect(result!.amount).toBe(3000);
    expect(result!.description).toBe("cliente x");
  });

  it("should parse 'despesa PF 150.50 mercado'", () => {
    const result = parseMessage("despesa PF 150.50 mercado");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("expense");
    expect(result!.scope).toBe("pf");
    expect(result!.amount).toBe(150.50);
    expect(result!.description).toBe("mercado");
  });

  it("should parse 'cartão PF 1.500,00 supermercado'", () => {
    const result = parseMessage("cartão PF 1.500,00 supermercado");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("expense");
    expect(result!.scope).toBe("pf");
    expect(result!.amount).toBe(1500);
    expect(result!.description).toBe("supermercado");
  });

  it("should parse shorthand 'PJ 500 equipamento'", () => {
    const result = parseMessage("PJ 500 equipamento");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("expense");
    expect(result!.scope).toBe("pj");
    expect(result!.amount).toBe(500);
    expect(result!.description).toBe("equipamento");
  });

  it("should parse 'cartao PJ 200 uber' (without accent)", () => {
    const result = parseMessage("cartao PJ 200 uber");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("expense");
    expect(result!.scope).toBe("pj");
    expect(result!.amount).toBe(200);
    expect(result!.description).toBe("uber");
  });

  it("should parse amount with comma as decimal separator", () => {
    const result = parseMessage("receita PJ 1500,50 projeto");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500.50);
  });

  it("should return null for unrecognized messages", () => {
    expect(parseMessage("olá")).toBeNull();
    expect(parseMessage("/start")).toBeNull();
    expect(parseMessage("qualquer coisa")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseMessage("")).toBeNull();
  });
});

describe("Telegram Bot - parseJobMessage", () => {
  it("should parse 'job Campanha Iguatemi 15000'", () => {
    const result = parseJobMessage("job Campanha Iguatemi 15000");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Campanha Iguatemi");
    expect(result!.totalCharged).toBe("15000.00");
  });

  it("should parse 'job Vídeo Institucional' without amount", () => {
    const result = parseJobMessage("job Vídeo Institucional");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Vídeo Institucional");
    expect(result!.totalCharged).toBeNull();
  });

  it("should parse 'job Campanha 1.500,00' with formatted amount", () => {
    const result = parseJobMessage("job Campanha 1.500,00");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Campanha");
    expect(result!.totalCharged).toBe("1500.00");
  });

  it("should parse 'Job Ensaio Fotográfico 800' (case insensitive)", () => {
    const result = parseJobMessage("Job Ensaio Fotográfico 800");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Ensaio Fotográfico");
    expect(result!.totalCharged).toBe("800.00");
  });

  it("should return null for non-job messages", () => {
    expect(parseJobMessage("receita PJ 3000 cliente")).toBeNull();
    expect(parseJobMessage("/jobs")).toBeNull();
    expect(parseJobMessage("olá")).toBeNull();
  });

  it("should return null for just 'job' without name", () => {
    const result = parseJobMessage("job");
    // Should match but with empty name or not match at all
    // The regex requires at least one char after "job "
    expect(result).toBeNull();
  });
});

describe("Telegram Bot - parseCategorizeResponse", () => {
  it("should parse '1 alimentação, 2 transporte'", () => {
    const result = parseCategorizeResponse("1 alimentação, 2 transporte");
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({ index: 1, category: "alimentação" });
    expect(result![1]).toEqual({ index: 2, category: "transporte" });
  });

  it("should parse 'todos alimentação'", () => {
    const result = parseCategorizeResponse("todos alimentação");
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({ index: "all", category: "alimentação" });
  });

  it("should parse 'todo assinaturas'", () => {
    const result = parseCategorizeResponse("todo assinaturas");
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({ index: "all", category: "assinaturas" });
  });

  it("should parse single item '3 equipamento'", () => {
    const result = parseCategorizeResponse("3 equipamento");
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({ index: 3, category: "equipamento" });
  });

  it("should parse semicolon-separated '1 alimentação; 2 lazer; 3 saúde'", () => {
    const result = parseCategorizeResponse("1 alimentação; 2 lazer; 3 saúde");
    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(result![0]).toEqual({ index: 1, category: "alimentação" });
    expect(result![1]).toEqual({ index: 2, category: "lazer" });
    expect(result![2]).toEqual({ index: 3, category: "saúde" });
  });

  it("should return null for unrecognized messages", () => {
    expect(parseCategorizeResponse("olá")).toBeNull();
    expect(parseCategorizeResponse("/start")).toBeNull();
    expect(parseCategorizeResponse("receita PJ 3000 cliente")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseCategorizeResponse("")).toBeNull();
  });

  it("should handle mixed case", () => {
    const result = parseCategorizeResponse("1 Alimentação, 2 TRANSPORTE");
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].category).toBe("alimentação");
    expect(result![1].category).toBe("transporte");
  });
});
