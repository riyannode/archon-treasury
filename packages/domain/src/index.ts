// Domain: Money value object (USDC atomic representation)
// Money is stored as string to avoid floating point issues.

export type AtomicAmount = string;

export interface Money {
  readonly amount: AtomicAmount;
  readonly decimals: number;
  readonly asset: string;
}

const USDC_DECIMALS = 6;

export function createUsdcMoney(humanAmount: number): Money {
  const atomic = Math.floor(humanAmount * 10 ** USDC_DECIMALS).toString();
  return { amount: atomic, decimals: USDC_DECIMALS, asset: "USDC" };
}

export function toHumanUsdc(money: Money): number {
  return Number(money.amount) / 10 ** money.decimals;
}

export function formatUsdc(money: Money): string {
  return `${toHumanUsdc(money)} ${money.asset}`;
}
