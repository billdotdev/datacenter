"use client";

import { Label as LabelPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "#/lib/utils";

function Label({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(
				"flex items-center gap-2 text-[11px] leading-none font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-muted)] select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
