export interface AppConfig {
  nodeEnv: "development" | "staging" | "production-testnet" | "production-mainnet";
  port: number;
  apiPort: number;
  logLevel: string;
  databaseUrl: string;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: (process.env["NODE_ENV"] as AppConfig["nodeEnv"]) ?? "development",
    port: Number(process.env["PORT"] ?? 3000),
    apiPort: Number(process.env["API_PORT"] ?? 3002),
    logLevel: process.env["LOG_LEVEL"] ?? "info",
    databaseUrl: process.env["DATABASE_URL"] ?? "",
  };
}
