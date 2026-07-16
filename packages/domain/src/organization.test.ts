import { describe, it, expect } from "vitest";
import {
  OrganizationSlug,
  normalizeSlug,
} from "./organization-slug.js";
import {
  OrganizationStatus,
  isValidOrganizationStatus,
  createOrganization,
  renameOrganization,
  changeOrganizationSlug,
  suspendOrganization,
  activateOrganization,
  type Organization,
} from "./organization.js";
import {
  DomainError,
  NotFoundError,
  ConflictError,
  ValidationError,
  organizationNotFoundError,
  organizationSlugConflictError,
  invalidOrganizationNameError,
  invalidOrganizationSlugError,
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
      const slug = OrganizationSlug.parse("archon-labs");
      expect(slug).toBe("archon-labs");
    });

    it("normalizes uppercase to lowercase", () => {
      const slug = OrganizationSlug.parse("Archon-Labs");
      expect(slug).toBe("archon-labs");
    });

    it("trims whitespace", () => {
      const slug = OrganizationSlug.parse("  archon-labs  ");
      expect(slug).toBe("archon-labs");
    });

    it("replaces spaces with hyphens", () => {
      const slug = OrganizationSlug.parse("Archon Labs");
      expect(slug).toBe("archon-labs");
    });

    it("replaces underscores with hyphens", () => {
      const slug = OrganizationSlug.parse("archon_labs");
      expect(slug).toBe("archon-labs");
    });

    it("collapses consecutive hyphens", () => {
      const slug = OrganizationSlug.parse("archon--labs");
      expect(slug).toBe("archon-labs");
    });

    it("strips leading hyphens", () => {
      const slug = OrganizationSlug.parse("-archon");
      expect(slug).toBe("archon");
    });

    it("strips trailing hyphens", () => {
      const slug = OrganizationSlug.parse("archon-");
      expect(slug).toBe("archon");
    });

    it("accepts digits", () => {
      const slug = OrganizationSlug.parse("org-123");
      expect(slug).toBe("org-123");
    });

    it("accepts single character", () => {
      const slug = OrganizationSlug.parse("a");
      expect(slug).toBe("a");
    });

    it("create is an alias for parse", () => {
      const slug = OrganizationSlug.create("my-org");
      expect(slug).toBe("my-org");
    });
  });

  describe("invalid slugs", () => {
    it("rejects empty string", () => {
      expect(() => OrganizationSlug.parse("")).toThrow("Invalid OrganizationSlug");
    });

    it("rejects string that becomes empty after normalization", () => {
      expect(() => OrganizationSlug.parse("!!!")).toThrow("Invalid OrganizationSlug");
    });

    it("strips special characters during normalization", () => {
      // "Archon Labs!" → "archon-labs" (the ! is stripped, spaces become hyphens)
      const slug = OrganizationSlug.parse("Archon Labs!");
      expect(slug).toBe("archon-labs");
    });

    it("rejects string longer than 63 chars", () => {
      const longSlug = "a".repeat(64);
      expect(() => OrganizationSlug.parse(longSlug)).toThrow("Invalid OrganizationSlug");
    });
  });

  describe("safe", () => {
    it("returns slug on valid input", () => {
      expect(OrganizationSlug.safe("my-org")).toBe("my-org");
    });

    it("returns null on invalid input", () => {
      expect(OrganizationSlug.safe("")).toBeNull();
    });

    it("returns slug after stripping special chars", () => {
      // "bad!slug" → "badslug" (the ! is stripped)
      expect(OrganizationSlug.safe("bad!slug")).toBe("badslug");
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
      expect(isValidOrganizationStatus("")).toBe(false);
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
      expect(org.createdAt).toBeInstanceOf(Date);
      expect(org.updatedAt).toBeInstanceOf(Date);
    });

    it("trims name", () => {
      const org = createOrganization({
        id: OrganizationId.parse(UUID_V4),
        name: "  Test Org  ",
        slug: OrganizationSlug.parse("test-org"),
      });
      expect(org.name).toBe("Test Org");
    });

    it("rejects empty name", () => {
      expect(() =>
        createOrganization({
          id: OrganizationId.parse(UUID_V4),
          name: "",
          slug: OrganizationSlug.parse("test-org"),
        }),
      ).toThrow("Invalid organization name");
    });

    it("rejects whitespace-only name", () => {
      expect(() =>
        createOrganization({
          id: OrganizationId.parse(UUID_V4),
          name: "   ",
          slug: OrganizationSlug.parse("test-org"),
        }),
      ).toThrow("Invalid organization name");
    });

    it("sets createdAt equal to updatedAt", () => {
      const org = createOrganization({
        id: OrganizationId.parse(UUID_V4),
        name: "Test",
        slug: OrganizationSlug.parse("test"),
      });
      expect(org.createdAt.getTime()).toBe(org.updatedAt.getTime());
    });

    it("uses provided timestamp when given", () => {
      const ts = new Date("2025-06-15T12:00:00Z");
      const org = createOrganization(
        {
          id: OrganizationId.parse(UUID_V4),
          name: "Test",
          slug: OrganizationSlug.parse("test"),
        },
        ts,
      );
      expect(org.createdAt).toBe(ts);
      expect(org.updatedAt).toBe(ts);
    });
  });

  describe("renameOrganization", () => {
    it("renames and updates timestamp", () => {
      const org = makeOrganization();
      const renamed = renameOrganization({ organization: org, name: "New Name" });
      expect(renamed.name).toBe("New Name");
      expect(renamed.id).toBe(org.id);
      expect(renamed.slug).toBe(org.slug);
      expect(renamed.updatedAt.getTime()).toBeGreaterThan(org.updatedAt.getTime());
    });

    it("rejects empty name", () => {
      const org = makeOrganization();
      expect(() => renameOrganization({ organization: org, name: "" })).toThrow(
        "Invalid organization name",
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
  });

  describe("suspendOrganization", () => {
    it("suspends active organization", () => {
      const org = makeOrganization({ status: OrganizationStatus.ACTIVE });
      const suspended = suspendOrganization(org);
      expect(suspended.status).toBe(OrganizationStatus.SUSPENDED);
    });

    it("no-op when already suspended", () => {
      const org = makeOrganization({ status: OrganizationStatus.SUSPENDED });
      const result = suspendOrganization(org);
      expect(result).toBe(org); // same reference — deterministic no-op
    });
  });

  describe("activateOrganization", () => {
    it("activates suspended organization", () => {
      const org = makeOrganization({ status: OrganizationStatus.SUSPENDED });
      const activated = activateOrganization(org);
      expect(activated.status).toBe(OrganizationStatus.ACTIVE);
    });

    it("updates timestamp even when already active", () => {
      const org = makeOrganization({ status: OrganizationStatus.ACTIVE });
      const result = activateOrganization(org);
      expect(result.status).toBe(OrganizationStatus.ACTIVE);
      expect(result.updatedAt.getTime()).toBeGreaterThan(org.updatedAt.getTime());
    });
  });
});

// ── Domain Errors ─────────────────────────────────────────────────────────

describe("Domain errors", () => {
  it("DomainError has code and message", () => {
    const err = new DomainError("test", "TEST_CODE");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("TEST_CODE");
    expect(err.message).toBe("test");
    expect(err.name).toBe("DomainError");
  });

  it("NotFoundError extends DomainError", () => {
    const err = new NotFoundError("Org", "123");
    expect(err).toBeInstanceOf(DomainError);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.name).toBe("NotFoundError");
  });

  it("ConflictError extends DomainError", () => {
    const err = new ConflictError("slug conflict");
    expect(err).toBeInstanceOf(DomainError);
    expect(err.code).toBe("CONFLICT");
  });

  it("ValidationError extends DomainError", () => {
    const err = new ValidationError("bad input");
    expect(err).toBeInstanceOf(DomainError);
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("organizationNotFoundError returns NotFoundError", () => {
    const err = organizationNotFoundError("some-id");
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.message).toContain("some-id");
  });

  it("organizationSlugConflictError returns ConflictError", () => {
    const err = organizationSlugConflictError("my-slug");
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.message).toContain("my-slug");
  });

  it("invalidOrganizationNameError returns ValidationError", () => {
    const err = invalidOrganizationNameError();
    expect(err).toBeInstanceOf(ValidationError);
  });

  it("invalidOrganizationSlugError returns ValidationError", () => {
    const err = invalidOrganizationSlugError();
    expect(err).toBeInstanceOf(ValidationError);
  });
});
