<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import Headline from "$lib/components/constants/headline.svelte";
</script>

<main class=" ">
  <Headline
    text="Auto-accepts match found pop-ups and lobby invites on renown to save time and keep you in the action."
  />

  <div
    class="mt-4 flex items-center justify-between text-slate-200 border-2 rounded-lg p-4 border-slate-900 pb-4"
  >
    <Label for="airplane-mode">Match found</Label>
    <Switch id="airplane-mode" />
  </div>
  <div
    class="mt-4 flex items-center justify-between text-slate-200 border-2 rounded-lg p-4 border-slate-900 pb-4"
  >
    <Label for="airplane-mode">Lobby invite</Label>
    <Switch id="airplane-mode" />
  </div>
</main>

<style></style>
