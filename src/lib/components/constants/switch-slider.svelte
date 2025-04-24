<script>
  import DiscriptionToggle from "$lib/components/constants/discriptionToggle.svelte";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Slider } from "$lib/components/ui/slider/index.js";
  let {
    labelText = "Default Label",
    labelText2 = "Default Label",
    descriptionText = "Default Description",
    descriptionText2 = "Default Description",
    switchId = "default-switch",
    checked = $bindable(false),
    disabled = false,
    warn = false,
  } = $props();
</script>

<div
  class="flex flex-col text-slate-200 border-2 border-slate-900 rounded-lg p-4"
>
  <div class="flex items-center justify-between">
    <div class="max-w-[24ch]">
      <h2 class="text-sm">{labelText}</h2>
      <DiscriptionToggle text={descriptionText} {warn} />
    </div>
    <Switch id={switchId} bind:checked {disabled} />
  </div>

  <div class="mt-4 border-t border-slate-900 pt-4">
    <h2 class="text-sm">{labelText2}</h2>
    <DiscriptionToggle text={descriptionText2} {warn} />
    <div class="flex flex-col items-center mt-4">
      <Slider
        type="multiple"
        value={[50]}
        max={7}
        step={1}
        class="max-w-[95%]"
        {disabled}
      />
      <section
        class="flex-1 max-w-[95%] flex w-full justify-between text-xs text-slate-400 pt-2"
      >
        <p>1s</p>
        <p>7s</p>
      </section>
    </div>
  </div>
</div>
