<script lang="ts">
  import {
    Slider as SliderPrimitive,
    type WithoutChildrenOrChild,
  } from "bits-ui";
  import { cn } from "$lib/utils.js";

  // Extended type to include custom properties
  type ExtendedSliderProps =
    WithoutChildrenOrChild<SliderPrimitive.RootProps> & {
      unit?: string;
    };

  let {
    ref = $bindable(null),
    value = $bindable(),
    orientation = "horizontal",
    class: className,
    unit = "seconds",
    ...restProps
  }: ExtendedSliderProps = $props();
</script>

<div class="flex flex-col items-center gap-2 w-full">
  <h2 class="text-sm w-full text-left font-normal">
    {value}
    {unit}
  </h2>
  <SliderPrimitive.Root
    bind:ref
    bind:value={value as never}
    {orientation}
    class={cn(
      "relative flex touch-none select-none items-center data-[orientation='vertical']:h-full data-[orientation='vertical']:min-h-44 data-[orientation='horizontal']:w-full data-[orientation='vertical']:w-auto data-[orientation='vertical']:flex-col",
      className
    )}
    {...restProps}
  >
    {#snippet children({ thumbs })}
      <span
        data-orientation={orientation}
        class="bg-secondary relative grow overflow-hidden rounded-full data-[orientation='horizontal']:h-2 data-[orientation='vertical']:h-full data-[orientation='horizontal']:w-full data-[orientation='vertical']:w-2"
      >
        <SliderPrimitive.Range
          class="bg-primary absolute data-[orientation='horizontal']:h-full data-[orientation='vertical']:w-full"
        />
      </span>
      {#each thumbs as thumb (thumb)}
        <SliderPrimitive.Thumb
          index={thumb}
          class="border-primary bg-background ring-offset-background focus-visible:ring-ring block size-5 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        />
      {/each}
    {/snippet}
  </SliderPrimitive.Root>
</div>
