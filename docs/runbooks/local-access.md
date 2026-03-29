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
