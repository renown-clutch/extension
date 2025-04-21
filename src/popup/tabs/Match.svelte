<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";

  let { showFaceitRanksOnMatchPage = $bindable(false) } = $props();
</script>

<main class="flex flex-col gap-4">
  <SwitchComponent
    labelText="Faceit Ranks"
    descriptionText="Show Faceit ranks on match page"
    bind:checked={showFaceitRanksOnMatchPage}
  />
</main>
