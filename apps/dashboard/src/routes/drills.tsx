import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { DrillCatalog } from "#/components/drill-catalog";
import {
  executeDrill,
  readDrillCatalog,
  setDisruptiveActionsEnabled,
} from "#/lib/drills/server";
import { readAuthPage } from "#/lib/session";

export const Route = createFileRoute("/drills")({
  loader: async () => {
    const authPage = await readAuthPage({
      data: { pathname: "/drills" },
    });

    if (!authPage.decision.allow) {
      throw redirect({ to: authPage.decision.redirectTo });
    }

    return {
      catalog: await readDrillCatalog(),
      session: authPage.session,
    };
  },
  component: DrillsPage,
});

function DrillsPage() {
  const initialData = Route.useLoaderData();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    initialData: initialData.catalog,
    queryFn: () => readDrillCatalog(),
    queryKey: ["drill-catalog"],
    refetchInterval: 20_000,
  });

  const executeMutation = useMutation({
    mutationFn: (drillKey: string) => executeDrill({ data: { drillKey } }),
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to execute drill",
      );
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["drill-catalog"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      setDisruptiveActionsEnabled({ data: { enabled } }),
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to update safety setting",
      );
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["drill-catalog"] });
    },
  });

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <DrillCatalog
        data={query.data}
        error={error}
        isRefreshing={query.isFetching}
        onExecute={(drillKey) => executeMutation.mutate(drillKey)}
        onToggleSafety={(enabled) => toggleMutation.mutate(enabled)}
        role={initialData.session?.user.role ?? "viewer"}
        toggleBusy={toggleMutation.isPending}
      />
    </main>
  );
}
