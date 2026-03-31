UPDATE "drill_target"
SET
	"selector" = '{"app":"istiod"}'::jsonb
WHERE "key" = 'istiod';
--> statement-breakpoint
UPDATE "drill_target"
SET
	"selector" = '{"app.kubernetes.io/component":"single-binary","app.kubernetes.io/instance":"loki"}'::jsonb,
	"service_name" = 'loki-gateway'
WHERE "key" = 'loki';
