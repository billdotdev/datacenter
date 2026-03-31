import { BatchV1Api, CoreV1Api, CustomObjectsApi, KubeConfig } from "@kubernetes/client-node";

export function createKubeClients() {
  const kubeConfig = new KubeConfig();
  kubeConfig.loadFromDefault();

  return {
    batchApi: kubeConfig.makeApiClient(BatchV1Api),
    coreApi: kubeConfig.makeApiClient(CoreV1Api),
    customObjectsApi: kubeConfig.makeApiClient(CustomObjectsApi),
  };
}
