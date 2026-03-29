# Local Access

## Argo CD

```bash
kubectl -n argocd port-forward svc/argocd-server 8080:443
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo
```

## Grafana

```bash
kubectl -n observability port-forward svc/kube-prometheus-stack-grafana 3000:80
```

## Prometheus

```bash
kubectl -n observability port-forward svc/kube-prometheus-stack-prometheus 9090
```
