# Dashboard Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the first deployable dashboard slice: a minimal TanStack Start app with a smoke page, a health endpoint, container packaging, Kubernetes manifests, and Argo CD wiring through the existing datacenter cluster composition.

**Architecture:** Keep application source under `apps/dashboard/` and keep app-specific Kubernetes manifests alongside the app so source and deployment stay coupled. Add a cluster-level Argo CD `Application` under `clusters/datacenter/` so the existing root app continues to own composition. Expose the dashboard through the existing shared `Gateway` and wildcard `*.datacenter.lan` certificate using an `HTTPRoute` for `dashboard.datacenter.lan`.

**Tech Stack:** TypeScript, TanStack Start, React, npm, Docker, Kubernetes, Gateway API, Argo CD, Bash

---

### Task 1: Scaffold The Dashboard App Shell

**Files:**
- Create: `apps/dashboard/package.json`
- Create: `apps/dashboard/tsconfig.json`
- Create: `apps/dashboard/vite.config.ts`
- Create: `apps/dashboard/app/routes/__root.tsx`
- Create: `apps/dashboard/app/routes/index.tsx`
- Create: `apps/dashboard/app/routes/health.tsx`
- Test: `tests/dashboard/test_dashboard_app_shell.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/package.json
test -f apps/dashboard/tsconfig.json
test -f apps/dashboard/vite.config.ts
test -f apps/dashboard/app/routes/__root.tsx
test -f apps/dashboard/app/routes/index.tsx
test -f apps/dashboard/app/routes/health.tsx

grep -q '"name": "@datacenter/dashboard"' apps/dashboard/package.json
grep -q '"dev"' apps/dashboard/package.json
grep -q '"build"' apps/dashboard/package.json
grep -q 'Dashboard' apps/dashboard/app/routes/index.tsx
grep -q 'ok' apps/dashboard/app/routes/health.tsx
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_dashboard_app_shell.sh`
Expected: FAIL because `apps/dashboard/` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```json
{
  "name": "@datacenter/dashboard",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --host 0.0.0.0 --port 3001",
    "build": "vite build",
    "start": "node .output/server/index.mjs"
  },
  "dependencies": {
    "@tanstack/react-router": "^1.0.0",
    "@tanstack/start": "^1.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0"
  }
}
```

```tsx
// apps/dashboard/app/routes/__root.tsx
import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return <Outlet />
}
```

```tsx
// apps/dashboard/app/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: DashboardIndex,
})

function DashboardIndex() {
  return (
    <main>
      <h1>Dashboard</h1>
      <p>Datacenter dashboard smoke page.</p>
    </main>
  )
}
```

```tsx
// apps/dashboard/app/routes/health.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/health')({
  component: HealthRoute,
})

function HealthRoute() {
  return <pre>{JSON.stringify({ ok: true })}</pre>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_dashboard_app_shell.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard tests/dashboard/test_dashboard_app_shell.sh
git commit -m "feat: add dashboard app shell"
```

### Task 2: Add Container Packaging And Smoke Verification

**Files:**
- Create: `apps/dashboard/Dockerfile`
- Create: `apps/dashboard/.dockerignore`
- Create: `tests/dashboard/test_dashboard_container_files.sh`
- Modify: `apps/dashboard/package.json`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/Dockerfile
test -f apps/dashboard/.dockerignore

grep -q 'npm run build' apps/dashboard/Dockerfile
grep -q 'EXPOSE 3001' apps/dashboard/Dockerfile
grep -q '"smoke"' apps/dashboard/package.json
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_dashboard_container_files.sh`
Expected: FAIL because container packaging does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3001
CMD ["npm", "run", "start"]
```

```gitignore
node_modules
.output
dist
```

```json
{
  "scripts": {
    "smoke": "npm run build"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_dashboard_container_files.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/Dockerfile apps/dashboard/.dockerignore apps/dashboard/package.json tests/dashboard/test_dashboard_container_files.sh
git commit -m "feat: add dashboard container packaging"
```

### Task 3: Add Kubernetes Manifests For Dashboard Deployment

**Files:**
- Create: `apps/dashboard/k8s/kustomization.yaml`
- Create: `apps/dashboard/k8s/namespace.yaml`
- Create: `apps/dashboard/k8s/deployment.yaml`
- Create: `apps/dashboard/k8s/service.yaml`
- Create: `apps/dashboard/k8s/httproute.yaml`
- Create: `tests/dashboard/test_dashboard_manifests.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/k8s/kustomization.yaml
test -f apps/dashboard/k8s/namespace.yaml
test -f apps/dashboard/k8s/deployment.yaml
test -f apps/dashboard/k8s/service.yaml
test -f apps/dashboard/k8s/httproute.yaml

grep -q 'name: dashboard' apps/dashboard/k8s/deployment.yaml
grep -q 'containerPort: 3001' apps/dashboard/k8s/deployment.yaml
grep -q 'dashboard.datacenter.lan' apps/dashboard/k8s/httproute.yaml
grep -q 'shared-gateway' apps/dashboard/k8s/httproute.yaml

kubectl kustomize apps/dashboard/k8s >/dev/null
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_dashboard_manifests.sh`
Expected: FAIL because the dashboard manifests do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: dashboard
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - httproute.yaml
```

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dashboard
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: dashboard
  template:
    metadata:
      labels:
        app.kubernetes.io/name: dashboard
    spec:
      containers:
        - name: dashboard
          image: ghcr.io/billdotdev/datacenter-dashboard:phase-1
          ports:
            - containerPort: 3001
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dashboard
spec:
  selector:
    app.kubernetes.io/name: dashboard
  ports:
    - name: http
      port: 80
      targetPort: 3001
```

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: dashboard
spec:
  parentRefs:
    - name: shared-gateway
      namespace: istio-ingress
  hostnames:
    - dashboard.datacenter.lan
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: dashboard
          port: 80
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_dashboard_manifests.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/k8s tests/dashboard/test_dashboard_manifests.sh
git commit -m "feat: add dashboard deployment manifests"
```

### Task 4: Wire Dashboard Into Cluster Composition And Access Docs

**Files:**
- Modify: `clusters/datacenter/kustomization.yaml`
- Create: `clusters/datacenter/dashboard.yaml`
- Modify: `docs/runbooks/local-access.md`
- Create: `tests/dashboard/test_dashboard_gitops_wiring.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f clusters/datacenter/dashboard.yaml

grep -q 'dashboard.yaml' clusters/datacenter/kustomization.yaml
grep -q 'path: apps/dashboard/k8s' clusters/datacenter/dashboard.yaml
grep -q 'name: dashboard' clusters/datacenter/dashboard.yaml
grep -q 'dashboard.datacenter.lan' docs/runbooks/local-access.md

kubectl kustomize clusters/datacenter >/dev/null
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_dashboard_gitops_wiring.sh`
Expected: FAIL because the dashboard Argo application and access docs do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - root-project.yaml
  - platform
  - dashboard.yaml
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dashboard
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "4"
spec:
  project: datacenter
  source:
    repoURL: https://github.com/billdotdev/datacenter.git
    targetRevision: main
    path: apps/dashboard/k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: dashboard
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```md
## Dashboard

Add `dashboard.datacenter.lan` to your local resolver for `10.100.0.240`, then open:

```text
https://dashboard.datacenter.lan
```
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_dashboard_gitops_wiring.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add clusters/datacenter/kustomization.yaml clusters/datacenter/dashboard.yaml docs/runbooks/local-access.md tests/dashboard/test_dashboard_gitops_wiring.sh
git commit -m "feat: wire dashboard into gitops"
```

### Task 5: Verify Phase 1 End To End

**Files:**
- Modify: `docs/runbooks/local-access.md`

- [ ] **Step 1: Run the dashboard-focused test suite**

Run: `bash tests/dashboard/test_dashboard_app_shell.sh && bash tests/dashboard/test_dashboard_container_files.sh && bash tests/dashboard/test_dashboard_manifests.sh && bash tests/dashboard/test_dashboard_gitops_wiring.sh`
Expected: PASS with no output.

- [ ] **Step 2: Render cluster composition**

Run: `kubectl kustomize clusters/datacenter >/dev/null`
Expected: PASS with no output.

- [ ] **Step 3: Sync and verify in-cluster**

Run: `kubectl get application dashboard -n argocd`
Expected: application exists after Argo sync.

Run: `kubectl get httproute -n dashboard`
Expected: `dashboard` route exists.

Run: `kubectl get pods -n dashboard`
Expected: one ready dashboard pod.

- [ ] **Step 4: Verify local access**

Run: `curl -k --resolve dashboard.datacenter.lan:443:10.100.0.240 https://dashboard.datacenter.lan/health`
Expected: response contains `ok`.

- [ ] **Step 5: Commit**

```bash
git add docs/runbooks/local-access.md
git commit -m "docs: add dashboard phase 1 verification notes"
```
