CREATE TABLE "treasuries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"environment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "treasuries_name_length" CHECK (char_length(btrim("treasuries"."name")) BETWEEN 1 AND 255),
	CONSTRAINT "treasuries_name_trimmed" CHECK ("treasuries"."name" = btrim("treasuries"."name")),
	CONSTRAINT "treasuries_status_check" CHECK ("treasuries"."status" IN ('active', 'suspended')),
	CONSTRAINT "treasuries_environment_check" CHECK ("treasuries"."environment" IN ('testnet', 'mainnet'))
);
--> statement-breakpoint
ALTER TABLE "treasuries" ADD CONSTRAINT "treasuries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "treasuries_organization_name_unique" ON "treasuries" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "treasuries_organization_idx" ON "treasuries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treasuries_status_idx" ON "treasuries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "treasuries_environment_idx" ON "treasuries" USING btree ("environment");