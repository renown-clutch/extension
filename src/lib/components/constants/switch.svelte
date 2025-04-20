<script>
  import DiscriptionToggle from "$lib/components/constants/discriptionToggle.svelte";
  import { Switch } from "$lib/components/ui/switch/index.js";
  export let labelText = "Default Label";
  export let descriptionText = "Default Description";
  export let switchId = "default-switch";
  export let checked = false;
</script>

<div
  class="flex items-center justify-between text-slate-200 border-2 border-slate-900 rounded-lg p-4"
>
  <div>
    <p>{labelText}</p>
    <DiscriptionToggle text={descriptionText} />
  </div>
  <Switch id={switchId} bind:checked />
</div>
