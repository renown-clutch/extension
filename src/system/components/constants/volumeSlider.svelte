<script>
  import DiscriptionToggle from "$system/components/constants/discriptionToggle.svelte";

  import { Slider } from "$system/components/ui/slider/index.js";
  export let labelText = "Default Label";
  export let descriptionText = "Default Description";
  export let disabled = false;
</script>

<div
  class="text-[var(--slate-200)] border-2 border-[var(--slate-900)] rounded-lg p-4 {disabled
    ? 'opacity-50 pointer-events-none'
    : ''}"
>
  <p>{labelText}</p>
  <DiscriptionToggle text={descriptionText} />
  <div class="flex flex-col items-center pt-6">
    <Slider
      type="multiple"
      value={[50]}
      max={100}
      step={1}
      class="max-w-[95%]"
      {disabled}
    />
    <section
      class="flex-1 flex w-full justify-between text-xs text-[var(--slate-400)] pt-2"
    >
      <p>0</p>
      <p>100</p>
    </section>
  </div>
</div>
