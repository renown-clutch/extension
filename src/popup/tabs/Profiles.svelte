<script lang="ts">
  import SwitchComponent from "$system/components/constants/switch.svelte";

  let {
    csstatsProfileButton = $bindable(false),
    faceitProfileButton = $bindable(false),
    showBans = $bindable(false),
    showHighestElo = $bindable(false),
    showLinkToCurrentMatch = $bindable(false),
    playerMatchupStats = $bindable(false),
  } = $props();
</script>

<main class="flex flex-col gap-4">
  <h2 class="text-lg">Buttons</h2>
  <SwitchComponent
    labelText="CSStats Button"
    descriptionText="Show CSStats profile button"
    bind:checked={csstatsProfileButton}
  />
  <SwitchComponent
    labelText="Faceit Button"
    descriptionText="Show Faceit profile button"
    bind:checked={faceitProfileButton}
  />
  <SwitchComponent
    labelText="Current Match Link"
    descriptionText="Show link to current match in player's profile"
    bind:checked={showLinkToCurrentMatch}
  />
  <h2 class="text-lg">Profile</h2>
  <SwitchComponent
    labelText="Highest ELO"
    descriptionText="Show player's highest ELO in their profile"
    bind:checked={showHighestElo}
  />
  <h2 class="text-lg">Bans</h2>
  <SwitchComponent
    labelText="Ban History"
    descriptionText="Show previous bans of the player in the profile"
    bind:checked={showBans}
  />
  <h2 class="text-lg">Matchup Stats</h2>
  <SwitchComponent
    labelText="Player Matchup Stats"
    descriptionText="Show matchup statistics between you and the viewed player"
    bind:checked={playerMatchupStats}
  />
</main>
