<script>
  import DiscriptionToggle from "./discriptionToggle.svelte";
  import { Switch } from "$system/components/ui/switch/index.js";
  let {
    labelText = "Default Label",
    descriptionText = "Default Description",
    switchId = "default-switch",
    checked = $bindable(false),
    disabled = $bindable(false),
    warn = false,
  } = $props();
</script>

<div
  class="flex items-center justify-between text-[var(--slate-200)] border-2 border-[var(--slate-900)] rounded-lg p-4"
>
  <div class="max-w-[80%]">
    <h2 class="text-sm">{labelText}</h2>
    <DiscriptionToggle text={descriptionText} {warn} />
  </div>
  <Switch id={switchId} bind:checked {disabled} />
</div>
