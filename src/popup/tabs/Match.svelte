<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";
  import MapVeto from "$lib/components/constants/map-veto.svelte";

  let {
    showFaceitRanksOnMatchPage = $bindable(false),
    showTeamAverageElo = $bindable(false),
  } = $props();
</script>

<main class="flex flex-col gap-4">
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

  <MapVeto />
</main>
