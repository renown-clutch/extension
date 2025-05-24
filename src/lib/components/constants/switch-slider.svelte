<script>
  import DiscriptionToggle from "$lib/components/constants/discriptionToggle.svelte";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { SliderWithState } from "$lib/components/ui/slider-with-state/index.js";
  let {
    labelText = "Default Label",
    labelText2 = "Default Label",
    descriptionText = "Default Description",
    descriptionText2 = "Default Description",
    switchId = "default-switch",
    checked = $bindable(false),
    sliderValue = $bindable(3),
    maxValue = 7,
    disabled = false,
    warn = false,
  } = $props();

  let sliderValueArray = $derived([sliderValue]);

  $effect(() => {
    sliderValue = sliderValueArray[0];
  });
</script>

<div
  class="flex flex-col text-[var(--slate-200)] border-2 border-[var(--slate-900)] rounded-lg p-4"
>
  <div class="flex items-center justify-between">
    <div class="max-w-[24ch]">
      <h2 class="text-sm">{labelText}</h2>
      <DiscriptionToggle text={descriptionText} {warn} />
    </div>
    <Switch id={switchId} bind:checked {disabled} />
  </div>

  <div class="mt-4 border-t border-[var(--slate-900)] pt-4">
    <h2 class="text-sm">{labelText2}</h2>
    <DiscriptionToggle text={descriptionText2} {warn} />
    <div class="flex flex-col items-center mt-4">
      <SliderWithState
        type="multiple"
        bind:value={sliderValueArray}
        max={maxValue}
        step={1}
        class="max-w-[95%]"
        disabled={disabled || !checked}
      />
      <section
        class="flex-1 max-w-[95%] flex w-full justify-between text-xs text-[var(--slate-400)] pt-2"
      >
        <p>0s</p>
        <p>{maxValue}s</p>
      </section>
    </div>
  </div>
</div>
