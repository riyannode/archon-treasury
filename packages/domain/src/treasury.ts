import type { OrganizationId, TreasuryId } from "./identifiers.js";
import {
  invalidTreasuryEnvironmentError,
  invalidTreasuryNameError,
  invalidTreasuryStatusError,
  treasuryPersistenceError,
  ValidationError,
} from "./errors.js";

export const TreasuryStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;

export type TreasuryStatus =
  (typeof TreasuryStatus)[keyof typeof TreasuryStatus];

export const TreasuryEnvironment = {
  TESTNET: "testnet",
  MAINNET: "mainnet",
} as const;

export type TreasuryEnvironment =
  (typeof TreasuryEnvironment)[keyof typeof TreasuryEnvironment];

export const TREASURY_NAME_MAX_LENGTH = 255;
export const TREASURY_NAME_RAW_MAX_LENGTH = 1_024;

const VALID_STATUSES = new Set<string>(Object.values(TreasuryStatus));
const VALID_ENVIRONMENTS = new Set<string>(Object.values(TreasuryEnvironment));

export interface Treasury {
  readonly id: TreasuryId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly status: TreasuryStatus;
  readonly environment: TreasuryEnvironment;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function isValidTreasuryStatus(status: string): boolean {
  return VALID_STATUSES.has(status);
}

export function validateTreasuryStatus(status: string): TreasuryStatus {
  if (!isValidTreasuryStatus(status)) throw invalidTreasuryStatusError();
  return status as TreasuryStatus;
}

export function isValidTreasuryEnvironment(environment: string): boolean {
  return VALID_ENVIRONMENTS.has(environment);
}

export function validateTreasuryEnvironment(
  environment: string,
): TreasuryEnvironment {
  if (!isValidTreasuryEnvironment(environment)) {
    throw invalidTreasuryEnvironmentError();
  }
  return environment as TreasuryEnvironment;
}

export function validateTreasuryName(name: unknown): string {
  if (typeof name !== "string" || name.length > TREASURY_NAME_RAW_MAX_LENGTH) {
    throw invalidTreasuryNameError();
  }

  const normalized = name.trim();
  if (normalized.length < 1 || normalized.length > TREASURY_NAME_MAX_LENGTH) {
    throw invalidTreasuryNameError();
  }
  return normalized;
}

export function validateTreasuryTimestamp(
  value: unknown,
  field: "createdAt" | "updatedAt",
): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw treasuryPersistenceError(`invalid persisted ${field}`);
  }
  return value;
}

function validateEntityTimestamps(treasury: Treasury): void {
  validateTreasuryTimestamp(treasury.createdAt, "createdAt");
  validateTreasuryTimestamp(treasury.updatedAt, "updatedAt");
}

function validMutationTime(now: Date): Date {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ValidationError("Invalid treasury timestamp");
  }
  return now;
}

export interface CreateTreasuryEntityInput {
  readonly id: TreasuryId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly environment: TreasuryEnvironment;
}

export function createTreasury(
  input: CreateTreasuryEntityInput,
  now: Date = new Date(),
): Treasury {
  const timestamp = validMutationTime(now);
  return Object.freeze({
    id: input.id,
    organizationId: input.organizationId,
    name: validateTreasuryName(input.name),
    status: TreasuryStatus.ACTIVE,
    environment: validateTreasuryEnvironment(input.environment),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export interface RenameTreasuryInput {
  readonly treasury: Treasury;
  readonly name: string;
  readonly now?: Date;
}

export function renameTreasury(input: RenameTreasuryInput): Treasury {
  validateEntityTimestamps(input.treasury);
  const name = validateTreasuryName(input.name);
  if (name === input.treasury.name) return input.treasury;
  return Object.freeze({
    ...input.treasury,
    name,
    updatedAt: validMutationTime(input.now ?? new Date()),
  });
}

export function suspendTreasury(
  treasury: Treasury,
  now: Date = new Date(),
): Treasury {
  validateEntityTimestamps(treasury);
  if (treasury.status === TreasuryStatus.SUSPENDED) return treasury;
  return Object.freeze({
    ...treasury,
    status: TreasuryStatus.SUSPENDED,
    updatedAt: validMutationTime(now),
  });
}

export function activateTreasury(
  treasury: Treasury,
  now: Date = new Date(),
): Treasury {
  validateEntityTimestamps(treasury);
  if (treasury.status === TreasuryStatus.ACTIVE) return treasury;
  return Object.freeze({
    ...treasury,
    status: TreasuryStatus.ACTIVE,
    updatedAt: validMutationTime(now),
  });
}
