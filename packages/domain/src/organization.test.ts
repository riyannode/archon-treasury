import { describe, it, expect } from "vitest";
import {
  OrganizationSlug,
  normalizeSlug,
  findInvalidSlugChars,
} from "./organization-slug.js";
import {
  OrganizationStatus,
  isValidOrganizationStatus,
  validateOrganizationStatus,
  createOrganization,
  renameOrganization,
  changeOrganizationSlug,
  suspendOrganization,
  activateOrganization,
  validateOrganizationName,
  type Organization,
} from "./organization.js";
import {
  DomainError,
  NotFoundError,
  ConflictError,
  ValidationError,
  DataIntegrityError,
  organizationNotFoundError,
  organizationSlugConflictError,
  emptyUpdateError,
  organizationPersistenceError,
} from "./errors.js";
import { OrganizationId } from "./identifiers.js";

// ── Test fixtures ─────────────────────────────────────────────────────────

const UUID_V4 = "550e8400-e29b-41d4-a716-446655440000";

function makeOrganization(overrides?: Partial<Organization>): Organization {
  return {
    id: OrganizationId.parse(UUID_V4),
    name: "Test Org",
    slug: OrganizationSlug.parse("test-org"),
    status: OrganizationStatus.ACTIVE,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ── OrganizationSlug ──────────────────────────────────────────────────────

describe("OrganizationSlug", () => {
  describe("parse / create", () => {
    it("parses a valid slug", () => {
      expect(OrganizationSlug.parse("archon-labs")).toBe("archon-labs");
    });

    it("normalizes uppercase to lowercase", () => {
      expect(OrganizationSlug.parse("Archon-Labs")).toBe("archon-labs");
    });

    it("trims whitespace", () => {
      expect(OrganizationSlug.parse("  archon-labs  ")).toBe("archon-labs");
    });

    it("replaces spaces with hyphens", () => {
      expect(OrganizationSlug.parse("Archon Labs")).toBe("archon-labs");
    });

    it("replaces underscores with hyphens", () => {
      expect(OrganizationSlug.parse("archon_labs")).toBe("archon-labs");
    });

    it("collapses consecutive hyphens", () => {
      expect(OrganizationSlug.parse("archon--labs")).toBe("archon-labs");
    });

    it("strips leading hyphens", () => {
      expect(OrganizationSlug.parse("-archon")).toBe("archon");
    });

    it("strips trailing hyphens", () => {
      expect(OrganizationSlug.parse("archon-")).toBe("archon");
    });

    it("accepts digits", () => {
      expect(OrganizationSlug.parse("org-123")).toBe("org-123");
    });

    it("accepts single character", () => {
      expect(OrganizationSlug.parse("a")).toBe("a");
    });

    it("create is an alias for parse", () => {
      expect(OrganizationSlug.create("my-org")).toBe("my-org");
    });
  });

  describe("invalid slugs — characters not silently stripped", () => {
    it("rejects exclamation mark", () => {
      expect(() => OrganizationSlug.parse("archon!")).toThrow(ValidationError);
    });

    it("rejects dollar sign", () => {
      expect(() => OrganizationSlug.parse("pay$labs")).toThrow(ValidationError);
    });

    it("rejects slash", () => {
      expect(() => OrganizationSlug.parse("archon/labs")).toThrow(ValidationError);
    });

    it("rejects non-ASCII", () => {
      expect(() => OrganizationSlug.parse("äρχον")).toThrow(ValidationError);
    });

    it("archon! does NOT become archon", () => {
      expect(normalizeSlug("archon!")).toBeNull();
    });

    it("pay$labs does NOT become paylabs", () => {
      expect(normalizeSlug("pay$labs")).toBeNull();
    });

    it("a/b does NOT become ab", () => {
      expect(normalizeSlug("a/b")).toBeNull();
    });

    it("rejects empty string — ValidationError", () => {
      expect(() => OrganizationSlug.parse("")).toThrow(ValidationError);
    });

    it("rejects string that becomes empty after normalization — ValidationError", () => {
      expect(() => OrganizationSlug.parse("!!!")).toThrow(ValidationError);
    });

    it("rejects string longer than 63 chars — ValidationError", () => {
      expect(() => OrganizationSlug.parse("a".repeat(64))).toThrow(ValidationError);
    });
  });

  describe("findInvalidSlugChars", () => {
    it("returns null for valid slug", () => {
      expect(findInvalidSlugChars("archon-labs")).toBeNull();
    });

    it("returns the invalid character for invalid input", () => {
      expect(findInvalidSlugChars("archon!")).toBe("!");
      expect(findInvalidSlugChars("pay$labs")).toBe("$");
      expect(findInvalidSlugChars("a/b")).toBe("/");
    });
  });

  describe("safe", () => {
    it("returns slug on valid input", () => {
      expect(OrganizationSlug.safe("my-org")).toBe("my-org");
    });

    it("returns null on invalid input", () => {
      expect(OrganizationSlug.safe("")).toBeNull();
    });

    it("returns null on special characters", () => {
      expect(OrganizationSlug.safe("bad!slug")).toBeNull();
    });
  });

  describe("value / serialize", () => {
    it("value returns the string", () => {
      const slug = OrganizationSlug.parse("test-org");
      expect(OrganizationSlug.value(slug)).toBe("test-org");
    });

    it("serialize returns the string", () => {
      const slug = OrganizationSlug.parse("test-org");
      expect(OrganizationSlug.serialize(slug)).toBe("test-org");
    });
  });

  describe("equals", () => {
    it("equal slugs are equal", () => {
      const a = OrganizationSlug.parse("test-org");
      const b = OrganizationSlug.parse("test-org");
      expect(OrganizationSlug.equals(a, b)).toBe(true);
    });

    it("different slugs are not equal", () => {
      const a = OrganizationSlug.parse("test-org");
      const b = OrganizationSlug.parse("other-org");
      expect(OrganizationSlug.equals(a, b)).toBe(false);
    });
  });

  describe("is", () => {
    it("returns true for valid slug string", () => {
      expect(OrganizationSlug.is("test-org")).toBe(true);
    });

    it("returns false for invalid slug string", () => {
      expect(OrganizationSlug.is("")).toBe(false);
      expect(OrganizationSlug.is("bad!slug")).toBe(false);
    });

    it("returns false for non-string", () => {
      expect(OrganizationSlug.is(123)).toBe(false);
      expect(OrganizationSlug.is(null)).toBe(false);
    });
  });

  describe("normalizeSlug", () => {
    it("normalizes mixed case with spaces", () => {
      expect(normalizeSlug(" My Cool Org ")).toBe("my-cool-org");
    });

    it("returns null for non-string input", () => {
      expect(normalizeSlug(undefined as unknown as string)).toBeNull();
    });

    it("returns null for empty result", () => {
      expect(normalizeSlug("   ")).toBeNull();
    });

    it("preserves valid hyphens", () => {
      expect(normalizeSlug("a-b-c")).toBe("a-b-c");
    });
  });
});

// ── Organization Entity ───────────────────────────────────────────────────

describe("Organization entity", () => {
  describe("OrganizationStatus", () => {
    it("has ACTIVE and SUSPENDED", () => {
      expect(OrganizationStatus.ACTIVE).toBe("active");
      expect(OrganizationStatus.SUSPENDED).toBe("suspended");
    });

    it("isValidOrganizationStatus accepts valid", () => {
      expect(isValidOrganizationStatus("active")).toBe(true);
      expect(isValidOrganizationStatus("suspended")).toBe(true);
    });

    it("isValidOrganizationStatus rejects invalid", () => {
      expect(isValidOrganizationStatus("deleted")).toBe(false);
    });

    it("validateOrganizationStatus returns valid status", () => {
      expect(validateOrganizationStatus("active")).toBe("active");
    });

    it("validateOrganizationStatus throws ValidationError for invalid", () => {
      expect(() => validateOrganizationStatus("deleted")).toThrow(ValidationError);
    });
  });

  describe("validateOrganizationName", () => {
    it("returns trimmed name for valid input", () => {
      expect(validateOrganizationName("  Test Org  ")).toBe("Test Org");
    });

    it("throws ValidationError for empty name", () => {
      expect(() => validateOrganizationName("")).toThrow(ValidationError);
    });

    it("throws ValidationError for whitespace-only name", () => {
      expect(() => validateOrganizationName("   ")).toThrow(ValidationError);
    });

    it("throws ValidationError for name > 255 chars", () => {
      expect(() => validateOrganizationName("a".repeat(256))).toThrow(ValidationError);
    });
  });

  describe("createOrganization", () => {
    it("creates with default ACTIVE status", () => {
      const org = createOrganization({
        id: OrganizationId.parse(UUID_V4),
        name: "Test Org",
        slug: OrganizationSlug.parse("test-org"),
      });
      expect(org.id).toBe(UUID_V4);
      expect(org.name).toBe("Test Org");
      expect(org.slug).toBe("test-org");
      expect(org.status).toBe(OrganizationStatus.ACTIVE);
    });

    it("trims name", () => {
      const org = createOrganization({
        id: OrganizationId.parse(UUID_V4),
        name: "  Test Org  ",
        slug: OrganizationSlug.parse("test-org"),
      });
      expect(org.name).toBe("Test Org");
    });

    it("rejects empty name with ValidationError", () => {
      expect(() =>
        createOrganization({
          id: OrganizationId.parse(UUID_V4),
          name: "",
          slug: OrganizationSlug.parse("test-org"),
        }),
      ).toThrow(ValidationError);
    });

    it("rejects whitespace-only name with ValidationError", () => {
      expect(() =>
        createOrganization({
          id: OrganizationId.parse(UUID_V4),
          name: "   ",
          slug: OrganizationSlug.parse("test-org"),
        }),
      ).toThrow(ValidationError);
    });

    it("sets createdAt equal to updatedAt", () => {
      const org = createOrganization({
        id: OrganizationId.parse(UUID_V4),
        name: "Test",
        slug: OrganizationSlug.parse("test"),
      });
      expect(org.createdAt.getTime()).toBe(org.updatedAt.getTime());
    });
  });

  describe("renameOrganization", () => {
    it("renames and updates timestamp", () => {
      const org = makeOrganization();
      const renamed = renameOrganization({ organization: org, name: "New Name" });
      expect(renamed.name).toBe("New Name");
      expect(renamed.updatedAt.getTime()).toBeGreaterThan(org.updatedAt.getTime());
    });

    it("same name → deterministic no-op, same reference", () => {
      const org = makeOrganization({ name: "Test Org" });
      const result = renameOrganization({ organization: org, name: "Test Org" });
      expect(result).toBe(org);
    });

    it("rejects empty name with ValidationError", () => {
      const org = makeOrganization();
      expect(() => renameOrganization({ organization: org, name: "" })).toThrow(
        ValidationError,
      );
    });
  });

  describe("changeOrganizationSlug", () => {
    it("changes slug and updates timestamp", () => {
      const org = makeOrganization();
      const newSlug = OrganizationSlug.parse("new-slug");
      const updated = changeOrganizationSlug({ organization: org, slug: newSlug });
      expect(updated.slug).toBe("new-slug");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(org.updatedAt.getTime());
    });

    it("same slug → deterministic no-op, same reference", () => {
      const org = makeOrganization({ slug: OrganizationSlug.parse("test-org") });
      const result = changeOrganizationSlug({
        organization: org,
        slug: OrganizationSlug.parse("test-org"),
      });
      expect(result).toBe(org);
    });
  });

  describe("suspendOrganization", () => {
    it("suspends active organization", () => {
      const org = makeOrganization({ status: OrganizationStatus.ACTIVE });
      expect(suspendOrganization(org).status).toBe(OrganizationStatus.SUSPENDED);
    });

    it("no-op when already suspended", () => {
      const org = makeOrganization({ status: OrganizationStatus.SUSPENDED });
      expect(suspendOrganization(org)).toBe(org);
    });
  });

  describe("activateOrganization", () => {
    it("activates suspended organization", () => {
      const org = makeOrganization({ status: OrganizationStatus.SUSPENDED });
      expect(activateOrganization(org).status).toBe(OrganizationStatus.ACTIVE);
    });

    it("no-op when already active — preserves updatedAt", () => {
      const org = makeOrganization({ status: OrganizationStatus.ACTIVE });
      expect(activateOrganization(org)).toBe(org);
    });
  });
});

// ── Domain Errors ─────────────────────────────────────────────────────────

describe("Domain errors", () => {
  it("DomainError has code and message", () => {
    const err = new DomainError("test", "TEST_CODE");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("TEST_CODE");
    expect(err.name).toBe("DomainError");
  });

  it("NotFoundError extends DomainError", () => {
    expect(new NotFoundError("Org", "123")).toBeInstanceOf(DomainError);
  });

  it("ConflictError extends DomainError", () => {
    expect(new ConflictError("x")).toBeInstanceOf(DomainError);
  });

  it("ValidationError extends DomainError", () => {
    expect(new ValidationError("x")).toBeInstanceOf(DomainError);
  });

  it("DataIntegrityError extends DomainError", () => {
    expect(new DataIntegrityError("x")).toBeInstanceOf(DomainError);
  });

  it("organizationNotFoundError returns NotFoundError", () => {
    expect(organizationNotFoundError("id")).toBeInstanceOf(NotFoundError);
  });

  it("organizationSlugConflictError returns ConflictError", () => {
    expect(organizationSlugConflictError("slug")).toBeInstanceOf(ConflictError);
  });

  it("emptyUpdateError returns ValidationError", () => {
    expect(emptyUpdateError()).toBeInstanceOf(ValidationError);
  });

  it("organizationPersistenceError returns DataIntegrityError", () => {
    expect(organizationPersistenceError("reason")).toBeInstanceOf(DataIntegrityError);
  });
});
