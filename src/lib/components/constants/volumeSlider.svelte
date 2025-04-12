<script>
  import DiscriptionToggle from "$lib/components/constants/discriptionToggle.svelte";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Slider } from "../ui/slider/index.js";
</script>

<div class=" text-slate-200 border-2 border-slate-900 rounded-lg p-4">
  <div>
    <Slider value={[50]} max={100} step={5} class="max-w-[100%]" />
    <section class="flex justify-between text-xs text-slate-400 pt-2">
      <p>0</p>
      <p>100</p>
    </section>
  </div>
</div>
