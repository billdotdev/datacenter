#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/src/db/schema.ts
test -f apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
test -f apps/dashboard/drizzle/0003_dashboard_phase4_target_fixes.sql

grep -q 'drillTarget' apps/dashboard/src/db/schema.ts
grep -q 'drillTargetId' apps/dashboard/src/db/schema.ts
grep -q 'targetType' apps/dashboard/src/db/schema.ts
grep -q 'traffic-spike' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'network-latency' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'network-error' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'node-cordon-drain' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'dashboard' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'istiod' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'datacenter-postgres' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'loki' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'cp-3' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q '"app":"istiod"' apps/dashboard/drizzle/0003_dashboard_phase4_target_fixes.sql
grep -q '"app.kubernetes.io/instance":"loki"' apps/dashboard/drizzle/0003_dashboard_phase4_target_fixes.sql
grep -q '"tag": "0002_dashboard_phase4_multi_target"' apps/dashboard/drizzle/meta/_journal.json
grep -q '"tag": "0003_dashboard_phase4_target_fixes"' apps/dashboard/drizzle/meta/_journal.json
