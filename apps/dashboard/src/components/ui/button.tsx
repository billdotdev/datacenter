import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "#/lib/utils";

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] border text-[12px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap transition-colors outline-none focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default:
					"border-primary bg-primary text-primary-foreground hover:bg-[color:var(--primary-accent-strong)]",
				destructive:
					"border-destructive bg-destructive text-white hover:opacity-92",
				outline:
					"border-[color:var(--outline-variant)] bg-white text-[color:var(--foreground-strong)] hover:bg-[color:var(--surface-container-low)]",
				secondary:
					"border-[color:var(--outline-variant)] bg-[color:var(--surface-container-low)] text-[color:var(--foreground-strong)] hover:bg-[color:var(--surface-container)]",
				ghost:
					"border-transparent bg-transparent text-[color:var(--foreground-strong)] hover:bg-[color:var(--surface-container-low)]",
				link: "border-transparent bg-transparent p-0 text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 px-4 has-[>svg]:px-3",
				xs: "h-6 gap-1 px-2 text-[10px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
				lg: "h-10 px-6 has-[>svg]:px-4",
				icon: "size-9",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
