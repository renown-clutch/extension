<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
</script>

<main class=" py-2">
  <h2 class="text-xl font-medium mb-4">Auto-accept</h2>

  <div class="flex items-center gap-8">
    <Label for="airplane-mode">Auto-accept new matches</Label>
    <Switch id="airplane-mode" />
  </div>
</main>

<style></style>
