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

## Dashboard

Add a local host entry for the shared gateway IP, then open the dashboard in a browser.

```bash
echo '10.100.0.240 dashboard.datacenter.lan' | sudo tee -a /etc/hosts
open https://dashboard.datacenter.lan
```

The dashboard `Deployment` expects the image `ghcr.io/billdotdev/datacenter-dashboard:main`. Push `main`, wait for the `Dashboard Image` GitHub Actions workflow to publish the image, then let Argo CD sync the `dashboard` application.

If the GHCR package is private, set `GHCR_USERNAME` and `GHCR_PULL_TOKEN` in `bootstrap/config/datacenter.env`, then apply the pull secret:

```bash
make dashboard-registry-secret
kubectl -n dashboard get secret regcred
```

The auth-enabled dashboard also needs app env in-cluster:

```bash
make dashboard-app-secret
kubectl -n dashboard get secret dashboard-app-env
```

## Dashboard Cluster Reads

After syncing the latest image, verify:

```bash
kubectl -n dashboard rollout status deployment/dashboard
curl -ksS --resolve dashboard.datacenter.lan:443:10.100.0.240 https://dashboard.datacenter.lan/health
```

Open `https://dashboard.datacenter.lan/` and confirm:

- node counts are populated
- node list renders
- Argo applications render
- refresh updates without a full page reload
