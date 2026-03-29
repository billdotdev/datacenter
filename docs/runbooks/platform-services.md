# Platform Services

## Verify

```bash
make cluster-verify
kubectl get applications -n argocd
kubectl get pods -n istio-system
kubectl get gateways.gateway.networking.k8s.io -A
kubectl get pods -n cert-manager
kubectl get pods -n database
kubectl get pods -n observability
kubectl get pods -n chaos-mesh
```

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
