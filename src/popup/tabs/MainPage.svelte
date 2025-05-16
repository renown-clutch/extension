<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";

  let {
    showLastPlayedMatches = $bindable(false),
    showAveragePartyElo = $bindable(false),
    showFaceitEloOnPartyList = $bindable(false),
  } = $props();
</script>

<main class="flex flex-col gap-4">
  <h2 class="text-lg">Main page</h2>
  <SwitchComponent
    labelText="Last Played Matches"
    descriptionText="Show your 3 last matches on main page"
    bind:checked={showLastPlayedMatches}
  />
  <SwitchComponent
    labelText="Average Party ELO"
    descriptionText="Show average ELO of your party"
    bind:checked={showAveragePartyElo}
  />
  <SwitchComponent
    labelText="Faceit ELO on Party List"
    descriptionText="Show Faceit ELO on party list"
    bind:checked={showFaceitEloOnPartyList}
  />
</main>
