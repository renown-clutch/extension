<script>
  import DiscriptionToggle from "$lib/components/constants/discriptionToggle.svelte";
  import { Switch } from "$lib/components/ui/switch/index.js";
  let {
    labelText = "Default Label",
    descriptionText = "Default Description",
    switchId = "default-switch",
    checked = $bindable(false),
  } = $props();
</script>

<div
  class="flex items-center justify-between text-slate-200 border-2 border-slate-900 rounded-lg p-4"
>
  <div class="max-w-[25ch]">
    <p class="">{labelText}</p>
    <DiscriptionToggle text={descriptionText} />
  </div>
  <Switch id={switchId} bind:checked />
</div>
