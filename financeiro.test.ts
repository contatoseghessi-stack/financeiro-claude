import { describe, expect, it } from "vitest";
import { parseMessage } from "./telegram-bot";

describe("Telegram Message Parser", () => {
  describe("cartão pattern", () => {
    it("parses 'cartão PF 150 mercado'", () => {
      const result = parseMessage("cartão PF 150 mercado");
      expect(result).toEqual({
        type: "expense",
        scope: "pf",
        amount: 150,
        description: "mercado",
      });
    });

    it("parses 'cartao PJ 500 software' (sem acento)", () => {
      const result = parseMessage("cartao PJ 500 software");
      expect(result).toEqual({
        type: "expense",
        scope: "pj",
        amount: 500,
        description: "software",
      });
    });

    it("parses 'cartão PF 1.500,00 equipamento novo'", () => {
      const result = parseMessage("cartão PF 1.500,00 equipamento novo");
      expect(result).toEqual({
        type: "expense",
        scope: "pf",
        amount: 1500,
        description: "equipamento novo",
      });
    });

    it("parses 'Cartão PJ 250,50 adobe creative cloud'", () => {
      const result = parseMessage("Cartão PJ 250,50 adobe creative cloud");
      expect(result).toEqual({
        type: "expense",
        scope: "pj",
        amount: 250.50,
        description: "adobe creative cloud",
      });
    });
  });

  describe("receita pattern", () => {
    it("parses 'receita PJ 3000 cliente X'", () => {
      const result = parseMessage("receita PJ 3000 cliente X");
      expect(result).toEqual({
        type: "income",
        scope: "pj",
        amount: 3000,
        description: "cliente x",
      });
    });

    it("parses 'receita PF 1500 freelance'", () => {
      const result = parseMessage("receita PF 1500 freelance");
      expect(result).toEqual({
        type: "income",
        scope: "pf",
        amount: 1500,
        description: "freelance",
      });
    });

    it("parses 'receita PJ 15.000,00 projeto campanha iguatemi'", () => {
      const result = parseMessage("receita PJ 15.000,00 projeto campanha iguatemi");
      expect(result).toEqual({
        type: "income",
        scope: "pj",
        amount: 15000,
        description: "projeto campanha iguatemi",
      });
    });
  });

  describe("despesa pattern", () => {
    it("parses 'despesa PJ 500 equipamento'", () => {
      const result = parseMessage("despesa PJ 500 equipamento");
      expect(result).toEqual({
        type: "expense",
        scope: "pj",
        amount: 500,
        description: "equipamento",
      });
    });

    it("parses 'despesa PF 80 uber'", () => {
      const result = parseMessage("despesa PF 80 uber");
      expect(result).toEqual({
        type: "expense",
        scope: "pf",
        amount: 80,
        description: "uber",
      });
    });
  });

  describe("shorthand pattern", () => {
    it("parses 'PF 80 uber'", () => {
      const result = parseMessage("PF 80 uber");
      expect(result).toEqual({
        type: "expense",
        scope: "pf",
        amount: 80,
        description: "uber",
      });
    });

    it("parses 'pj 3500 projeto video'", () => {
      const result = parseMessage("pj 3500 projeto video");
      expect(result).toEqual({
        type: "expense",
        scope: "pj",
        amount: 3500,
        description: "projeto video",
      });
    });
  });

  describe("invalid messages", () => {
    it("returns null for random text", () => {
      expect(parseMessage("oi tudo bem?")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseMessage("")).toBeNull();
    });

    it("returns null for just a number", () => {
      expect(parseMessage("150")).toBeNull();
    });

    it("returns null for command-like text", () => {
      expect(parseMessage("/unknown")).toBeNull();
    });
  });

  describe("amount parsing edge cases", () => {
    it("handles comma decimal: 150,50", () => {
      const result = parseMessage("PF 150,50 mercado");
      expect(result?.amount).toBe(150.50);
    });

    it("handles Brazilian thousands: 1.500,00", () => {
      const result = parseMessage("PJ 1.500,00 equipamento");
      expect(result?.amount).toBe(1500);
    });

    it("handles integer values", () => {
      const result = parseMessage("PF 200 restaurante");
      expect(result?.amount).toBe(200);
    });
  });
});
