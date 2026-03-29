import { CoreV1Api, CustomObjectsApi, KubeConfig } from "@kubernetes/client-node";

export function createKubeClients() {
  const kubeConfig = new KubeConfig();
  kubeConfig.loadFromDefault();

  return {
    coreApi: kubeConfig.makeApiClient(CoreV1Api),
    customObjectsApi: kubeConfig.makeApiClient(CustomObjectsApi),
  };
}
