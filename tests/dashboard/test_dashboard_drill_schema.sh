#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/src/db/schema.ts
test -f apps/dashboard/drizzle/0001_dashboard_drill_execution.sql

grep -q 'drill_definition' apps/dashboard/src/db/schema.ts
grep -q 'drill_run' apps/dashboard/src/db/schema.ts
grep -q 'audit_log' apps/dashboard/src/db/schema.ts
grep -q 'app_config' apps/dashboard/src/db/schema.ts
grep -q 'pod-delete-dashboard' apps/dashboard/drizzle/0001_dashboard_drill_execution.sql
grep -q 'disruptive_actions_enabled' apps/dashboard/drizzle/0001_dashboard_drill_execution.sql
grep -q '"tag": "0001_dashboard_drill_execution"' apps/dashboard/drizzle/meta/_journal.json
