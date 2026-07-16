CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_name_length" CHECK (char_length(btrim("organizations"."name")) BETWEEN 1 AND 255),
	CONSTRAINT "organizations_slug_length" CHECK (char_length("organizations"."slug") BETWEEN 1 AND 63),
	CONSTRAINT "organizations_slug_format" CHECK ("organizations"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "organizations_status_check" CHECK ("organizations"."status" IN ('active', 'suspended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");