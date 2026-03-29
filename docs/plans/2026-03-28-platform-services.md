# Platform Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first GitOps-managed platform layer on top of the bootstrapped cluster: ingress, internal TLS, PostgreSQL, Prometheus, Grafana, Loki, and chaos tooling.

**Architecture:** Keep `clusters/datacenter/` as the Argo CD entrypoint and add child `Application` objects for each platform subsystem. Install Gateway API CRDs first, then install the Istio control plane in `minimal` profile with separate `base` and `istiod` charts, and expose workloads through Kubernetes `Gateway` and `HTTPRoute` resources instead of legacy Ingress. Keep repo-owned values files under `platform/`, and keep local manifests for cluster-specific resources such as issuers, shared gateways, and PostgreSQL clusters in repo-local Kustomize directories.

**Tech Stack:** Argo CD, Kubernetes Gateway API, Istio (`base`, `istiod`), Helm charts through Argo CD, Kustomize, cert-manager, CloudNativePG, kube-prometheus-stack, Loki, Promtail, Chaos Mesh, YAML, Bash

---

### Task 1: Add Cluster Composition For Gateway API And Platform Applications

**Files:**

- Modify: `clusters/datacenter/kustomization.yaml`
- Create: `clusters/datacenter/platform/kustomization.yaml`
- Create: `clusters/datacenter/platform/gateway-api-crds.yaml`
- Create: `clusters/datacenter/platform/istio-base.yaml`
- Create: `clusters/datacenter/platform/istiod.yaml`
- Create: `clusters/datacenter/platform/gateway-shared.yaml`
- Create: `clusters/datacenter/platform/cert-manager.yaml`
- Create: `clusters/datacenter/platform/internal-tls.yaml`
- Create: `clusters/datacenter/platform/postgres-operator.yaml`
- Create: `clusters/datacenter/platform/postgres-cluster.yaml`
- Create: `clusters/datacenter/platform/kube-prometheus-stack.yaml`
- Create: `clusters/datacenter/platform/loki.yaml`
- Create: `clusters/datacenter/platform/promtail.yaml`
- Create: `clusters/datacenter/platform/chaos-mesh.yaml`
- Test: `tests/platform/test_platform_applications.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f clusters/datacenter/platform/kustomization.yaml
test -f clusters/datacenter/platform/gateway-api-crds.yaml
test -f clusters/datacenter/platform/istio-base.yaml
test -f clusters/datacenter/platform/istiod.yaml
test -f clusters/datacenter/platform/gateway-shared.yaml
test -f clusters/datacenter/platform/cert-manager.yaml
test -f clusters/datacenter/platform/internal-tls.yaml
test -f clusters/datacenter/platform/postgres-operator.yaml
test -f clusters/datacenter/platform/postgres-cluster.yaml
test -f clusters/datacenter/platform/kube-prometheus-stack.yaml
test -f clusters/datacenter/platform/loki.yaml
test -f clusters/datacenter/platform/promtail.yaml
test -f clusters/datacenter/platform/chaos-mesh.yaml

kubectl kustomize clusters/datacenter >/dev/null
kubectl kustomize clusters/datacenter/platform >/dev/null
grep -q 'gateway-api-crds.yaml' clusters/datacenter/platform/kustomization.yaml
grep -q 'istiod.yaml' clusters/datacenter/platform/kustomization.yaml
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/platform/test_platform_applications.sh`
Expected: FAIL because the Gateway API and Istio application manifests do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - root-project.yaml
  - root-application.yaml
  - platform
```

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gateway-api-crds.yaml
  - istio-base.yaml
  - istiod.yaml
  - gateway-shared.yaml
  - cert-manager.yaml
  - internal-tls.yaml
  - postgres-operator.yaml
  - postgres-cluster.yaml
  - kube-prometheus-stack.yaml
  - loki.yaml
  - promtail.yaml
  - chaos-mesh.yaml
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: gateway-api-crds
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: datacenter
  source:
    repoURL: https://github.com/kubernetes-sigs/gateway-api.git
    targetRevision: v1.4.0
    path: config/crd
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-base
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  project: datacenter
  source:
    repoURL: https://istio-release.storage.googleapis.com/charts
    chart: base
    targetRevision: 1.28.3
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istiod
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  project: datacenter
  sources:
    - repoURL: https://istio-release.storage.googleapis.com/charts
      chart: istiod
      targetRevision: 1.28.3
      helm:
        valueFiles:
          - $values/platform/security/istio/istiod-values.yaml
    - repoURL: https://github.com/billdotdev/datacenter.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: gateway-shared
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "3"
spec:
  project: datacenter
  source:
    repoURL: https://github.com/billdotdev/datacenter.git
    targetRevision: main
    path: platform/security/gateway-api/shared-gateway
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-ingress
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  project: datacenter
  sources:
    - repoURL: https://charts.jetstack.io
      chart: cert-manager
      targetRevision: v1.17.1
      helm:
        valueFiles:
          - $values/platform/security/cert-manager/values.yaml
    - repoURL: https://github.com/billdotdev/datacenter.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: internal-tls
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  project: datacenter
  source:
    repoURL: https://github.com/billdotdev/datacenter.git
    targetRevision: main
    path: platform/security/internal-tls
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: postgres-operator
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  project: datacenter
  sources:
    - repoURL: https://cloudnative-pg.github.io/charts
      chart: cloudnative-pg
      targetRevision: 0.23.2
      helm:
        valueFiles:
          - $values/platform/data/cloudnative-pg/values.yaml
    - repoURL: https://github.com/billdotdev/datacenter.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: database
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: postgres-cluster
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  project: datacenter
  source:
    repoURL: https://github.com/billdotdev/datacenter.git
    targetRevision: main
    path: platform/data/postgres
  destination:
    server: https://kubernetes.default.svc
    namespace: database
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kube-prometheus-stack
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  project: datacenter
  sources:
    - repoURL: https://prometheus-community.github.io/helm-charts
      chart: kube-prometheus-stack
      targetRevision: 69.8.2
      helm:
        valueFiles:
          - $values/platform/observability/kube-prometheus-stack/values.yaml
    - repoURL: https://github.com/billdotdev/datacenter.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: observability
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: loki
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  project: datacenter
  sources:
    - repoURL: https://grafana.github.io/helm-charts
      chart: loki
      targetRevision: 6.27.0
      helm:
        valueFiles:
          - $values/platform/observability/loki/values.yaml
    - repoURL: https://github.com/billdotdev/datacenter.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: observability
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: promtail
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "3"
spec:
  project: datacenter
  sources:
    - repoURL: https://grafana.github.io/helm-charts
      chart: promtail
      targetRevision: 6.16.6
      helm:
        valueFiles:
          - $values/platform/observability/promtail/values.yaml
    - repoURL: https://github.com/billdotdev/datacenter.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: observability
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: chaos-mesh
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  project: datacenter
  sources:
    - repoURL: https://charts.chaos-mesh.org
      chart: chaos-mesh
      targetRevision: 2.7.2
      helm:
        valueFiles:
          - $values/platform/chaos/chaos-mesh/values.yaml
    - repoURL: https://github.com/billdotdev/datacenter.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: chaos-mesh
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f clusters/datacenter/platform/kustomization.yaml
test -f clusters/datacenter/platform/gateway-api-crds.yaml
test -f clusters/datacenter/platform/istio-base.yaml
test -f clusters/datacenter/platform/istiod.yaml
test -f clusters/datacenter/platform/gateway-shared.yaml
test -f clusters/datacenter/platform/cert-manager.yaml
test -f clusters/datacenter/platform/internal-tls.yaml
test -f clusters/datacenter/platform/postgres-operator.yaml
test -f clusters/datacenter/platform/postgres-cluster.yaml
test -f clusters/datacenter/platform/kube-prometheus-stack.yaml
test -f clusters/datacenter/platform/loki.yaml
test -f clusters/datacenter/platform/promtail.yaml
test -f clusters/datacenter/platform/chaos-mesh.yaml

kubectl kustomize clusters/datacenter >/dev/null
kubectl kustomize clusters/datacenter/platform >/dev/null
grep -q 'gateway-api-crds.yaml' clusters/datacenter/platform/kustomization.yaml
grep -q 'istiod.yaml' clusters/datacenter/platform/kustomization.yaml
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/platform/test_platform_applications.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add clusters/datacenter/kustomization.yaml clusters/datacenter/platform tests/platform/test_platform_applications.sh
git commit -m "feat: add istio and gateway api platform composition"
```

### Task 2: Add Gateway API, Istio Control Plane, And Internal TLS Foundations

**Files:**

- Create: `platform/security/istio/istiod-values.yaml`
- Create: `platform/security/gateway-api/shared-gateway/kustomization.yaml`
- Create: `platform/security/gateway-api/shared-gateway/namespace.yaml`
- Create: `platform/security/gateway-api/shared-gateway/gateway.yaml`
- Create: `platform/security/cert-manager/values.yaml`
- Create: `platform/security/internal-tls/kustomization.yaml`
- Create: `platform/security/internal-tls/root-selfsigned-issuer.yaml`
- Create: `platform/security/internal-tls/root-ca-certificate.yaml`
- Create: `platform/security/internal-tls/cluster-issuer.yaml`
- Create: `platform/security/internal-tls/ingress-certificate.yaml`
- Test: `tests/platform/test_security_manifests.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f platform/security/istio/istiod-values.yaml
test -f platform/security/gateway-api/shared-gateway/kustomization.yaml
test -f platform/security/gateway-api/shared-gateway/namespace.yaml
test -f platform/security/gateway-api/shared-gateway/gateway.yaml
test -f platform/security/cert-manager/values.yaml
test -f platform/security/internal-tls/kustomization.yaml
test -f platform/security/internal-tls/root-selfsigned-issuer.yaml
test -f platform/security/internal-tls/root-ca-certificate.yaml
test -f platform/security/internal-tls/cluster-issuer.yaml
test -f platform/security/internal-tls/ingress-certificate.yaml

kubectl kustomize platform/security/gateway-api/shared-gateway >/dev/null
kubectl kustomize platform/security/internal-tls >/dev/null
grep -q '^profile: minimal$' platform/security/istio/istiod-values.yaml
grep -q 'gatewayClassName: istio' platform/security/gateway-api/shared-gateway/gateway.yaml
grep -q '^crds:$' platform/security/cert-manager/values.yaml
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/platform/test_security_manifests.sh`
Expected: FAIL because the Istio and Gateway API foundation files do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```yaml
profile: minimal
meshConfig:
  accessLogFile: /dev/stdout
pilot:
  replicaCount: 2
```

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - gateway.yaml
```

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: istio-ingress
```

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: istio-ingress
spec:
  gatewayClassName: istio
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: All
    - name: https
      hostname: "*.datacenter.lan"
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: datacenter-ingress-tls
      allowedRoutes:
        namespaces:
          from: All
```

```yaml
crds:
  enabled: true
prometheus:
  enabled: true
webhook:
  timeoutSeconds: 10
```

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - root-selfsigned-issuer.yaml
  - root-ca-certificate.yaml
  - cluster-issuer.yaml
  - ingress-certificate.yaml
```

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: datacenter-selfsigned-bootstrap
spec:
  selfSigned: {}
```

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: datacenter-root-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: datacenter-root-ca
  secretName: datacenter-root-ca
  duration: 87600h
  renewBefore: 720h
  privateKey:
    algorithm: RSA
    size: 4096
  issuerRef:
    name: datacenter-selfsigned-bootstrap
    kind: ClusterIssuer
```

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: datacenter-ca
spec:
  ca:
    secretName: datacenter-root-ca
```

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: datacenter-ingress-tls
  namespace: istio-ingress
spec:
  secretName: datacenter-ingress-tls
  commonName: ingress.datacenter.lan
  dnsNames:
    - ingress.datacenter.lan
    - "*.datacenter.lan"
  issuerRef:
    name: datacenter-ca
    kind: ClusterIssuer
```

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f platform/security/istio/istiod-values.yaml
test -f platform/security/gateway-api/shared-gateway/kustomization.yaml
test -f platform/security/gateway-api/shared-gateway/namespace.yaml
test -f platform/security/gateway-api/shared-gateway/gateway.yaml
test -f platform/security/cert-manager/values.yaml
test -f platform/security/internal-tls/kustomization.yaml
test -f platform/security/internal-tls/root-selfsigned-issuer.yaml
test -f platform/security/internal-tls/root-ca-certificate.yaml
test -f platform/security/internal-tls/cluster-issuer.yaml
test -f platform/security/internal-tls/ingress-certificate.yaml

kubectl kustomize platform/security/gateway-api/shared-gateway >/dev/null
kubectl kustomize platform/security/internal-tls >/dev/null
grep -q '^profile: minimal$' platform/security/istio/istiod-values.yaml
grep -q 'accessLogFile: /dev/stdout' platform/security/istio/istiod-values.yaml
grep -q 'replicaCount: 2' platform/security/istio/istiod-values.yaml
grep -q 'gatewayClassName: istio' platform/security/gateway-api/shared-gateway/gateway.yaml
grep -q 'certificateRefs:' platform/security/gateway-api/shared-gateway/gateway.yaml
grep -q 'name: datacenter-ingress-tls' platform/security/gateway-api/shared-gateway/gateway.yaml
grep -q '^crds:$' platform/security/cert-manager/values.yaml
grep -q 'enabled: true' platform/security/cert-manager/values.yaml
grep -q 'duration: 87600h' platform/security/internal-tls/root-ca-certificate.yaml
grep -q 'renewBefore: 720h' platform/security/internal-tls/root-ca-certificate.yaml
grep -q 'secretName: datacenter-root-ca' platform/security/internal-tls/cluster-issuer.yaml
grep -q 'name: datacenter-ca' platform/security/internal-tls/ingress-certificate.yaml
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/platform/test_security_manifests.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add platform/security tests/platform/test_security_manifests.sh
git commit -m "feat: add istio gateway and internal tls foundations"
```

### Task 3: Add PostgreSQL Operator And Cluster Manifests

**Files:**

- Create: `platform/data/cloudnative-pg/values.yaml`
- Create: `platform/data/postgres/kustomization.yaml`
- Create: `platform/data/postgres/cluster.yaml`
- Create: `platform/data/postgres/backup-schedule.yaml`
- Test: `tests/platform/test_postgres_manifests.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f platform/data/cloudnative-pg/values.yaml
test -f platform/data/postgres/kustomization.yaml
test -f platform/data/postgres/cluster.yaml
test -f platform/data/postgres/backup-schedule.yaml

kubectl kustomize platform/data/postgres >/dev/null
grep -q 'monitoring:' platform/data/postgres/cluster.yaml
grep -q 'storageClass' platform/data/postgres/cluster.yaml
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/platform/test_postgres_manifests.sh`
Expected: FAIL because the database manifests do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```yaml
config:
  data:
    INHERITED_ANNOTATIONS: argocd.argoproj.io/sync-wave
monitoring:
  podMonitorEnabled: true
crds:
  create: true
```

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cluster.yaml
  - backup-schedule.yaml
```

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: datacenter-postgres
  namespace: database
spec:
  instances: 3
  storage:
    size: 20Gi
    storageClass: local-path
  monitoring:
    enablePodMonitor: true
  bootstrap:
    initdb:
      database: datacenter
      owner: datacenter
  managed:
    roles:
      - name: datacenter
        login: true
        superuser: false
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
```

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: datacenter-postgres-daily
  namespace: database
spec:
  schedule: "0 3 * * *"
  backupOwnerReference: self
  cluster:
    name: datacenter-postgres
```

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f platform/data/cloudnative-pg/values.yaml
test -f platform/data/postgres/kustomization.yaml
test -f platform/data/postgres/cluster.yaml
test -f platform/data/postgres/backup-schedule.yaml

kubectl kustomize platform/data/postgres >/dev/null
grep -q 'instances: 3' platform/data/postgres/cluster.yaml
grep -q 'enablePodMonitor: true' platform/data/postgres/cluster.yaml
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/platform/test_postgres_manifests.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add platform/data tests/platform/test_postgres_manifests.sh
git commit -m "feat: add postgres operator and cluster manifests"
```

### Task 4: Add Observability Stack Values And Log Shipping

**Files:**

- Create: `platform/observability/kube-prometheus-stack/values.yaml`
- Create: `platform/observability/loki/values.yaml`
- Create: `platform/observability/promtail/values.yaml`
- Test: `tests/platform/test_observability_values.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f platform/observability/kube-prometheus-stack/values.yaml
test -f platform/observability/loki/values.yaml
test -f platform/observability/promtail/values.yaml

grep -q 'grafana:' platform/observability/kube-prometheus-stack/values.yaml
grep -q 'loki:' platform/observability/promtail/values.yaml
grep -q 'retention_period:' platform/observability/loki/values.yaml
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/platform/test_observability_values.sh`
Expected: FAIL because the observability values files do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```yaml
grafana:
  enabled: true
  adminPassword: changeme-before-prod
  service:
    type: ClusterIP
  grafana.ini:
    server:
      root_url: https://grafana.datacenter.lan
prometheus:
  prometheusSpec:
    retention: 7d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: local-path
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 20Gi
alertmanager:
  enabled: false
```

```yaml
loki:
  auth_enabled: false
  commonConfig:
    replication_factor: 1
  storage:
    type: filesystem
  compactor:
    retention_enabled: true
  limits_config:
    retention_period: 168h
singleBinary:
  replicas: 1
monitoring:
  serviceMonitor:
    enabled: true
```

```yaml
config:
  clients:
    - url: http://loki-gateway.observability.svc.cluster.local/loki/api/v1/push
  snippets:
    pipelineStages:
      - cri: {}
serviceMonitor:
  enabled: true
```

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f platform/observability/kube-prometheus-stack/values.yaml
test -f platform/observability/loki/values.yaml
test -f platform/observability/promtail/values.yaml

grep -q 'retention: 7d' platform/observability/kube-prometheus-stack/values.yaml
grep -q 'retention_period: 168h' platform/observability/loki/values.yaml
grep -q 'loki-gateway.observability.svc.cluster.local' platform/observability/promtail/values.yaml
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/platform/test_observability_values.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add platform/observability tests/platform/test_observability_values.sh
git commit -m "feat: add observability stack values"
```

### Task 5: Add Chaos Tooling And Safety Defaults

**Files:**

- Create: `platform/chaos/chaos-mesh/values.yaml`
- Create: `platform/chaos/chaos-mesh/README.md`
- Test: `tests/platform/test_chaos_values.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f platform/chaos/chaos-mesh/values.yaml
test -f platform/chaos/chaos-mesh/README.md

grep -q 'dashboard:' platform/chaos/chaos-mesh/values.yaml
grep -q 'chaosDaemon' platform/chaos/chaos-mesh/values.yaml
grep -q 'manual-only' platform/chaos/chaos-mesh/README.md
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/platform/test_chaos_values.sh`
Expected: FAIL because the chaos tooling files do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```yaml
dashboard:
  create: false
controllerManager:
  replicaCount: 1
chaosDaemon:
  runtime: containerd
  socketPath: /run/k3s/containerd/containerd.sock
dnsServer:
  create: false
```

```markdown
# Chaos Mesh Safety Notes

- manual-only in v1
- no scheduled experiments until application safety controls exist
- deploy the operator and CRDs now, but gate experiment authoring behind the later dashboard backend
```

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f platform/chaos/chaos-mesh/values.yaml
test -f platform/chaos/chaos-mesh/README.md

grep -q 'create: false' platform/chaos/chaos-mesh/values.yaml
grep -q 'socketPath: /run/k3s/containerd/containerd.sock' platform/chaos/chaos-mesh/values.yaml
grep -q 'manual-only' platform/chaos/chaos-mesh/README.md
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/platform/test_chaos_values.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add platform/chaos tests/platform/test_chaos_values.sh
git commit -m "feat: add chaos mesh safety defaults"
```

### Task 6: Add Access And Operations Documentation For Platform Services

**Files:**

- Modify: `README.md`
- Create: `docs/runbooks/platform-services.md`
- Create: `docs/runbooks/local-access.md`
- Test: `tests/docs/test_platform_docs.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f docs/runbooks/platform-services.md
test -f docs/runbooks/local-access.md

grep -q 'make cluster-verify' docs/runbooks/platform-services.md
grep -q 'kubectl -n argocd port-forward svc/argocd-server 8080:443' docs/runbooks/local-access.md
grep -q 'docs/runbooks/local-access.md' README.md
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/docs/test_platform_docs.sh`
Expected: FAIL because the new runbooks and README links do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```text
# Platform Services

## Verify

    make cluster-verify
    kubectl get applications -n argocd
    kubectl get pods -n istio-system
    kubectl get gateways.gateway.networking.k8s.io -A
    kubectl get pods -n cert-manager
    kubectl get pods -n database
    kubectl get pods -n observability
    kubectl get pods -n chaos-mesh

## Expected Applications

- `gateway-api-crds`
- `istio-base`
- `istiod`
- `gateway-shared`
- `cert-manager`
- `internal-tls`
- `postgres-operator`
- `postgres-cluster`
- `kube-prometheus-stack`
- `loki`
- `promtail`
- `chaos-mesh`
```

```text
# Local Access

## Argo CD

    kubectl -n argocd port-forward svc/argocd-server 8080:443
    kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo

## Grafana

    kubectl -n observability port-forward svc/kube-prometheus-stack-grafana 3000:80

## Prometheus

    kubectl -n observability port-forward svc/kube-prometheus-stack-prometheus 9090
```

```text
## Docs

- `docs/runbooks/cluster-bootstrap.md`
- `docs/runbooks/platform-services.md`
- `docs/runbooks/local-access.md`
- `docs/specs/2026-03-28-datacenter-dashboard-design.md`
- `docs/proxmox/hardware-overview.md`
- `docs/proxmox/network-configuration.md`
```

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f docs/runbooks/platform-services.md
test -f docs/runbooks/local-access.md

grep -q 'kube-prometheus-stack' docs/runbooks/platform-services.md
grep -q 'port-forward svc/argocd-server 8080:443' docs/runbooks/local-access.md
grep -q 'docs/runbooks/local-access.md' README.md
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/docs/test_platform_docs.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/runbooks/platform-services.md docs/runbooks/local-access.md tests/docs/test_platform_docs.sh
git commit -m "docs: add platform service runbooks"
```

### Validation Milestone

After all tasks:

```bash
bash tests/platform/test_platform_applications.sh
bash tests/platform/test_security_manifests.sh
bash tests/platform/test_postgres_manifests.sh
bash tests/platform/test_observability_values.sh
bash tests/platform/test_chaos_values.sh
bash tests/docs/test_platform_docs.sh
kubectl get applications -n argocd
kubectl get certificates,clusterissuers -A
kubectl get clusters.postgresql.cnpg.io -n database
kubectl get pods -n observability
```

Expected:

- all test scripts pass
- all Argo CD applications show `Synced` and `Healthy`
- `datacenter-ca` exists as a `ClusterIssuer`
- `datacenter-postgres` exists and reports healthy instances
- Prometheus, Grafana, Loki, and Promtail pods are running
