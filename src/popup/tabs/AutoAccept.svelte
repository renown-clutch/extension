<script lang="ts">
  import type { UserSettings } from "$system/lib/types";
  import { defaultUserSettings } from "$system/lib/types";
  import SwitchSlider from "$system/components/constants/switch-slider.svelte";

  let {
    autoAccept = $bindable<UserSettings["autoAccept"]>(
      defaultUserSettings.autoAccept
    ),
    matchAutoAcceptDelay = $bindable<UserSettings["matchAutoAcceptDelay"]>(
      defaultUserSettings.matchAutoAcceptDelay
    ),
    partyAutoAcceptDelay = $bindable<UserSettings["partyAutoAcceptDelay"]>(
      defaultUserSettings.partyAutoAcceptDelay
    ),
  } = $props();
</script>

<main class=" flex flex-col gap-4">
  <SwitchSlider
    labelText="Match found"
    descriptionText="Auto-accept new matches"
    labelText2="Delay"
    descriptionText2="Delay in seconds before accepting"
    bind:checked={autoAccept.match}
    bind:sliderValue={matchAutoAcceptDelay}
  />
  <SwitchSlider
    labelText="Lobby invite"
    descriptionText="Auto-accept new lobby invitations"
    labelText2="Delay"
    descriptionText2="Delay in seconds before accepting"
    bind:checked={autoAccept.party}
    bind:sliderValue={partyAutoAcceptDelay}
  />
</main>

<style></style>
