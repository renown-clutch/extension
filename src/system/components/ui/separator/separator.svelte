<script lang="ts">
  import { Separator as SeparatorPrimitive } from "bits-ui";
  import { cn } from "$system/lib/utils";

  let {
    ref = $bindable(null),
    class: className,
    orientation = "horizontal",
    ...restProps
  }: SeparatorPrimitive.RootProps = $props();
</script>

<SeparatorPrimitive.Root
  bind:ref
  class={cn(
    "shrink-0 bg-[var(--slate-700)]",
    orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
    className
  )}
  {orientation}
  {...restProps}
/>
