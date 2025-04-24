<script lang="ts">
  import type { UserSettings } from "$lib/types";
  import { defaultUserSettings } from "$lib/types";
  import { onMount } from "svelte";
  import SwitchSlider from "$lib/components/constants/switch-slider.svelte";

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

  // Keep track of previous values to detect changes
  let previousMatch = defaultUserSettings.autoAccept.match;
  let previousParty = defaultUserSettings.autoAccept.party;

  onMount(() => {
    previousMatch = autoAccept.match;
    previousParty = autoAccept.party;
  });

  // Watch for changes and force reload if needed
  $effect(() => {
    // Skip on initial load
    if (
      previousMatch === autoAccept.match &&
      previousParty === autoAccept.party
    ) {
      return;
    }

    const matchChanged = previousMatch !== autoAccept.match;
    const partyChanged = previousParty !== autoAccept.party;

    previousMatch = autoAccept.match;
    previousParty = autoAccept.party;

    if (matchChanged || partyChanged) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "forceReload",
            reason: matchChanged
              ? autoAccept.match
                ? "match_auto_accept_enabled"
                : "match_auto_accept_disabled"
              : partyChanged
                ? autoAccept.party
                  ? "party_auto_accept_enabled"
                  : "party_auto_accept_disabled"
                : "auto_accept_delay_changed",
          });
        }
      });
    }
  });
</script>

<main class=" flex flex-col gap-4">
  <h2 class="text-lg">Match found</h2>
  <SwitchSlider
    labelText="Match found"
    descriptionText="Auto-accept new matches"
    labelText2="Delay"
    descriptionText2="Delay in seconds before accepting"
    bind:checked={autoAccept.match}
    bind:sliderValue={matchAutoAcceptDelay}
  />
  <h2 class="text-lg">Lobby invite</h2>
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
