CREATE TABLE "drill_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"requires_disruptive_actions" boolean DEFAULT true NOT NULL,
	"target_namespace" text NOT NULL,
	"target_selector" jsonb NOT NULL,
	"blast_radius_summary" text NOT NULL,
	"chaos_template" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drill_definition_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "drill_run" (
	"id" text PRIMARY KEY NOT NULL,
	"drill_definition_id" text NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"status" text NOT NULL,
	"target_summary" text NOT NULL,
	"chaos_namespace" text,
	"chaos_name" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"actor_user_id" text,
	"subject_type" text NOT NULL,
	"subject_id" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"boolean_value" boolean NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drill_run" ADD CONSTRAINT "drill_run_definition_fk" FOREIGN KEY ("drill_definition_id") REFERENCES "public"."drill_definition"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "drill_run" ADD CONSTRAINT "drill_run_requested_by_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "drill_definition_key_idx" ON "drill_definition" USING btree ("key");
--> statement-breakpoint
CREATE INDEX "drill_run_definition_idx" ON "drill_run" USING btree ("drill_definition_id");
--> statement-breakpoint
CREATE INDEX "drill_run_requested_by_idx" ON "drill_run" USING btree ("requested_by_user_id");
--> statement-breakpoint
CREATE INDEX "drill_run_status_idx" ON "drill_run" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "audit_log_event_type_idx" ON "audit_log" USING btree ("event_type");
--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id");
--> statement-breakpoint
INSERT INTO "drill_definition" (
	"id",
	"key",
	"name",
	"kind",
	"enabled",
	"requires_disruptive_actions",
	"target_namespace",
	"target_selector",
	"blast_radius_summary",
	"chaos_template"
) VALUES (
	'drill-pod-delete-dashboard',
	'pod-delete-dashboard',
	'Delete One Dashboard Pod',
	'pod_delete',
	true,
	true,
	'dashboard',
	'{"app.kubernetes.io/name":"dashboard"}'::jsonb,
	'Restarts one dashboard pod in namespace dashboard.'::text,
	'{"action":"pod-kill","mode":"one"}'::jsonb
);
--> statement-breakpoint
INSERT INTO "app_config" ("key", "boolean_value")
VALUES ('disruptive_actions_enabled', false);
