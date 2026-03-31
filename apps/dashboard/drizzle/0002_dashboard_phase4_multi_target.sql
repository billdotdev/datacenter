CREATE TABLE "drill_target" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"namespace" text,
	"service_name" text,
	"selector" jsonb,
	"node_name" text,
	"blast_radius_summary" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drill_target_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX "drill_target_key_idx" ON "drill_target" USING btree ("key");
--> statement-breakpoint
ALTER TABLE "drill_definition"
	ADD COLUMN "target_type" text DEFAULT 'workload' NOT NULL,
	ADD COLUMN "template" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "drill_run"
	ADD COLUMN "drill_target_id" text,
	ADD COLUMN "drill_key" text,
	ADD COLUMN "target_key" text;
--> statement-breakpoint
UPDATE "drill_definition"
SET
	"key" = 'pod-delete',
	"name" = 'Delete One Pod',
	"target_type" = 'workload',
	"template" = '{"executor":"podChaos","action":"pod-kill","mode":"one"}'::jsonb
WHERE "id" = 'drill-pod-delete-dashboard';
--> statement-breakpoint
INSERT INTO "drill_definition" (
	"id",
	"key",
	"name",
	"kind",
	"enabled",
	"requires_disruptive_actions",
	"target_type",
	"target_namespace",
	"target_selector",
	"blast_radius_summary",
	"template",
	"chaos_template"
) VALUES
(
	'drill-traffic-spike',
	'traffic-spike',
	'Traffic Spike',
	'traffic_spike',
	true,
	true,
	'workload',
	'',
	'{}'::jsonb,
	'Generate fixed HTTP load against one approved service target.',
	'{"executor":"loadJob","durationSeconds":60,"requestsPerSecond":25}'::jsonb,
	'{}'::jsonb
),
(
	'drill-network-latency',
	'network-latency',
	'Inject Network Latency',
	'network_latency',
	true,
	true,
	'workload',
	'',
	'{}'::jsonb,
	'Inject fixed latency against one approved workload target.',
	'{"executor":"networkChaos","action":"delay","latency":"120ms","correlation":"100"}'::jsonb,
	'{}'::jsonb
),
(
	'drill-network-error',
	'network-error',
	'Inject Network Error',
	'network_error',
	true,
	true,
	'workload',
	'',
	'{}'::jsonb,
	'Inject fixed packet loss against one approved workload target.',
	'{"executor":"networkChaos","action":"loss","loss":"12","correlation":"100"}'::jsonb,
	'{}'::jsonb
),
(
	'drill-node-cordon-drain',
	'node-cordon-drain',
	'Cordon And Drain Node',
	'node_cordon_drain',
	true,
	true,
	'node',
	'',
	'{}'::jsonb,
	'Cordon and drain one exact approved node.',
	'{"executor":"nodeDrain","deleteEmptyDirData":false,"ignoreDaemonSets":true}'::jsonb,
	'{}'::jsonb
);
--> statement-breakpoint
INSERT INTO "drill_target" (
	"id",
	"key",
	"name",
	"kind",
	"namespace",
	"service_name",
	"selector",
	"node_name",
	"blast_radius_summary",
	"enabled"
) VALUES
(
	'target-dashboard',
	'dashboard',
	'Dashboard',
	'workload',
	'dashboard',
	'dashboard',
	'{"app.kubernetes.io/name":"dashboard"}'::jsonb,
	NULL,
	'Affects the dashboard service only.',
	true
),
(
	'target-istiod',
	'istiod',
	'Istiod',
	'workload',
	'istio-system',
	NULL,
	'{"app.kubernetes.io/name":"istiod"}'::jsonb,
	NULL,
	'Affects the Istio control plane only.',
	true
),
(
	'target-datacenter-postgres',
	'datacenter-postgres',
	'Datacenter Postgres',
	'workload',
	'database',
	NULL,
	'{"cnpg.io/cluster":"datacenter-postgres"}'::jsonb,
	NULL,
	'Affects the PostgreSQL cluster pods only.',
	true
),
(
	'target-loki',
	'loki',
	'Loki',
	'workload',
	'observability',
	'loki-gateway',
	'{"app.kubernetes.io/name":"loki","app.kubernetes.io/component":"single-binary"}'::jsonb,
	NULL,
	'Affects the Loki single-binary workload.',
	true
),
(
	'target-cp-3',
	'cp-3',
	'cp-3',
	'node',
	NULL,
	NULL,
	NULL,
	'cp-3',
	'Affects the exact node cp-3.',
	true
);
--> statement-breakpoint
UPDATE "drill_run"
SET
	"drill_target_id" = 'target-dashboard',
	"drill_key" = 'pod-delete',
	"target_key" = 'dashboard'
WHERE "drill_target_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "drill_run" ALTER COLUMN "drill_target_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "drill_run" ALTER COLUMN "drill_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "drill_run" ALTER COLUMN "target_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "drill_run" ADD CONSTRAINT "drill_run_target_fk" FOREIGN KEY ("drill_target_id") REFERENCES "public"."drill_target"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "drill_run_target_idx" ON "drill_run" USING btree ("drill_target_id");
