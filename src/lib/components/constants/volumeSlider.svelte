<script>
  import DiscriptionToggle from "$lib/components/constants/discriptionToggle.svelte";

  import { Slider } from "../ui/slider/index.js";
  export let labelText = "Default Label";
  export let descriptionText = "Default Description";
</script>

<div class=" text-slate-200 border-2 border-slate-900 rounded-lg p-4">
  <p>{labelText}</p>
  <DiscriptionToggle text={descriptionText} />
  <div class="flex flex-col items-center pt-6">
    <Slider value={[50]} max={100} step={5} class="max-w-[95%]" />
    <section
      class="flex-1 flex w-full justify-between text-xs text-slate-400 pt-2"
    >
      <p>0</p>
      <p>100</p>
    </section>
  </div>
</div>
