<script>
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { SliderWithState } from "$lib/components/ui/slider-with-state/index.js";
  import DiscriptionToggle from "$lib/components/constants/discriptionToggle.svelte";

  let {
    labelText = "Dropdown Label",
    description = "Dropdown description",
    sliderLabelText = "Slider Label",
    sliderDescription = "Slider description",
    options = [],
    selectedValue = $bindable(""),
    sliderValue = $bindable(3),
    maxValue = 100,
    disabled = false,
    warn = false,
  } = $props();

  let sliderValueArray = $derived([sliderValue]);

  const triggerContent = $derived(
    options.find((opt) => opt.value === selectedValue)?.label ??
      "Select an option"
  );

  $effect(() => {
    sliderValue = sliderValueArray[0];
  });
</script>

<div
  class="flex flex-col text-slate-200 border-2 border-slate-900 rounded-lg p-4"
>
  <div class="flex items-center justify-between">
    <div class="max-w-[24ch]">
      <h2 class="text-sm">{labelText}</h2>
      <DiscriptionToggle text={description} {warn} />
    </div>
    <div>
      <Select.Root type="single" bind:value={selectedValue}>
        <Select.Trigger class="w-[180px]" {disabled}>
          {triggerContent}
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            {#each options as option (option.value)}
              <Select.Item value={option.value} label={option.label}>
                {option.label}
              </Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <div class="mt-4 border-t border-slate-900 pt-4">
    <h2 class="text-sm">{sliderLabelText}</h2>
    <DiscriptionToggle text={sliderDescription} {warn} />
    <div class="flex flex-col items-center mt-4">
      <SliderWithState
        type="multiple"
        bind:value={sliderValueArray}
        max={maxValue}
        step={1}
        class="max-w-[95%]"
        disabled={disabled || !selectedValue}
        unit="%"
      />
      <section
        class="flex-1 max-w-[95%] flex w-full justify-between text-xs text-slate-400 pt-2"
      >
        <p>0%</p>
        <p>{maxValue}%</p>
      </section>
    </div>
  </div>
</div>
