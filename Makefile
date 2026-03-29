SHELL := /bin/bash

.PHONY: bootstrap-validate
bootstrap-validate:
	bash bootstrap/scripts/validate-env.sh

.PHONY: cluster-up
cluster-up:
	bash bootstrap/scripts/cluster-up.sh

.PHONY: cluster-verify
cluster-verify:
	bash bootstrap/scripts/cluster-verify.sh

.PHONY: dashboard-registry-secret
dashboard-registry-secret:
	bash bootstrap/scripts/dashboard-registry-secret.sh

.PHONY: dashboard-app-secret
dashboard-app-secret:
	bash bootstrap/scripts/dashboard-app-secret.sh
