import { invalidUserEmailError } from "./errors.js";

const EMAIL_MAX_RAW_LENGTH = 512;
const EMAIL_MAX_LENGTH = 320;
const LOCAL_MAX_LENGTH = 64;
const DOMAIN_MAX_LENGTH = 255;
const DOMAIN_LABEL_MAX_LENGTH = 63;
const LOCAL_SPECIALS = new Set("!#$%&'*+-/=?^_`{|}~".split(""));

type Brand<K extends string, T> = T & { readonly __brand: K };

export type UserEmail = Brand<"UserEmail", string>;

export function normalizeEmail(raw: string): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > EMAIL_MAX_RAW_LENGTH) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > EMAIL_MAX_LENGTH) {
    return null;
  }
  return normalized;
}

function isAsciiLetterOrDigit(char: string): boolean {
  return (
    (char >= "a" && char <= "z") ||
    (char >= "0" && char <= "9")
  );
}

function isValidLocalPart(local: string): boolean {
  if (local.length === 0 || local.length > LOCAL_MAX_LENGTH) return false;
  if (local[0] === "." || local[local.length - 1] === ".") return false;

  let previousWasDot = false;
  for (const char of local) {
    if (char === ".") {
      if (previousWasDot) return false;
      previousWasDot = true;
      continue;
    }
    previousWasDot = false;
    if (!isAsciiLetterOrDigit(char) && !LOCAL_SPECIALS.has(char)) return false;
  }
  return true;
}

function isValidDomain(domain: string): boolean {
  if (domain.length === 0 || domain.length > DOMAIN_MAX_LENGTH) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;

  for (const label of labels) {
    if (label.length === 0 || label.length > DOMAIN_LABEL_MAX_LENGTH) return false;
    if (label[0] === "-" || label[label.length - 1] === "-") return false;
    for (const char of label) {
      if (!isAsciiLetterOrDigit(char) && char !== "-") return false;
    }
  }
  return true;
}

function validate(raw: string): UserEmail {
  const normalized = normalizeEmail(raw);
  if (normalized === null) throw invalidUserEmailError();

  const at = normalized.indexOf("@");
  if (at <= 0 || at !== normalized.lastIndexOf("@")) {
    throw invalidUserEmailError();
  }

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (!isValidLocalPart(local) || !isValidDomain(domain)) {
    throw invalidUserEmailError();
  }
  return normalized as UserEmail;
}

export interface UserEmailAPI {
  parse(raw: string): UserEmail;
  create(raw: string): UserEmail;
  safe(raw: string): UserEmail | null;
  is(value: unknown): value is UserEmail;
  value(email: UserEmail): string;
  serialize(email: UserEmail): string;
  equals(a: UserEmail, b: UserEmail): boolean;
}

export const UserEmail: UserEmailAPI = {
  parse: validate,
  create: validate,
  safe: (raw) => {
    try {
      return validate(raw);
    } catch {
      return null;
    }
  },
  is: (value): value is UserEmail =>
    typeof value === "string" && UserEmail.safe(value) === value,
  value: (email) => email as string,
  serialize: (email) => email as string,
  equals: (a, b) => (a as string) === (b as string),
};
