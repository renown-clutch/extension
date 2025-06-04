<script lang="ts" module>
  import { type VariantProps, tv } from "tailwind-variants";

  export const alertVariants = tv({
    base: "[&>svg]:text-[var(--slate-200)] relative w-full rounded-lg border border-[var(--slate-700)] p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
    variants: {
      variant: {
        default: "bg-[var(--slate-900)] text-[var(--slate-200)]",
        destructive:
          "border-[var(--slate-700)]/50 text-[var(--slate-200)] dark:border-[var(--slate-700)] [&>svg]:text-[var(--slate-200)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  });

  export type AlertVariant = VariantProps<typeof alertVariants>["variant"];
</script>

<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import type { WithElementRef } from "bits-ui";
  import { cn } from "$system/lib/utils";

  let {
    ref = $bindable(null),
    class: className,
    variant = "default",
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    variant?: AlertVariant;
  } = $props();
</script>

<div
  bind:this={ref}
  class={cn(alertVariants({ variant }), className)}
  {...restProps}
  role="alert"
>
  {@render children?.()}
</div>
