<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";
  import MapVeto from "$lib/components/constants/map-veto.svelte";

  let {
    showFaceitRanksOnMatchPage = $bindable(false),
    showTeamAverageElo = $bindable(false),
    showMapStats = $bindable(false),
  } = $props();
</script>

<main class="flex flex-col gap-4">
  <h2 class="text-lg">Ranks & Elo</h2>
  <SwitchComponent
    labelText="Faceit Ranks"
    descriptionText="Show Faceit ranks on match page"
    bind:checked={showFaceitRanksOnMatchPage}
  />

  <SwitchComponent
    labelText="Team Average ELO"
    descriptionText="Show team average ELO next to team name"
    bind:checked={showTeamAverageElo}
  />

  <h2 class="text-lg">Map Stats</h2>
  <SwitchComponent
    labelText="Map Stats"
    descriptionText="Show map pick rates for each team"
    bind:checked={showMapStats}
  />
  <!-- <h2 class="text-lg">Auto Ban Maps</h2>
  <SwitchComponent
    labelText="Auto Ban"
    descriptionText="Automatically ban maps based on your picks"
  />
  <MapVeto /> -->
</main>
