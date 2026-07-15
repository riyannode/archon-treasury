import { describe, it, expect } from "vitest";
import { createUsdcMoney, toHumanUsdc, formatUsdc } from "./index.js";

describe("Money (USDC)", () => {
  it("creates USDC money from human amount", () => {
    const m = createUsdcMoney(1.5);
    expect(m.amount).toBe("1500000");
    expect(m.decimals).toBe(6);
    expect(m.asset).toBe("USDC");
  });

  it("converts atomic back to human", () => {
    const m = createUsdcMoney(10);
    expect(toHumanUsdc(m)).toBe(10);
  });

  it("formats as string", () => {
    const m = createUsdcMoney(42.000001);
    expect(formatUsdc(m)).toContain("USDC");
  });

  it("handles zero", () => {
    const m = createUsdcMoney(0);
    expect(m.amount).toBe("0");
    expect(toHumanUsdc(m)).toBe(0);
  });
});
