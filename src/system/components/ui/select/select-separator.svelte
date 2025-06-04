<script lang="ts">
  import type { Separator as SeparatorPrimitive } from "bits-ui";
  import { Separator } from "$system/components/ui/separator/index.js";
  import { cn } from "$system/lib/utils";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SeparatorPrimitive.RootProps = $props();
</script>

<Separator
  bind:ref
  class={cn("bg-[var(--slate-700)] -mx-1 my-1 h-px", className)}
  {...restProps}
/>
