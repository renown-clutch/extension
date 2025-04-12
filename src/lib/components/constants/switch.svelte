<script>
  import DiscriptionButton from "$lib/components/constants/discriptionButton.svelte";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  export let labelText = "Default Label";
  export let descriptionText = "Default Description";
  export let switchId = "default-switch";
</script>

<div
  class="flex items-center justify-between text-slate-200 border-2 border-slate-900 rounded-lg p-4"
>
  <div>
    <Label for={switchId}>{labelText}</Label>
    <DiscriptionButton text={descriptionText} />
  </div>
  <Switch id={switchId} />
</div>
