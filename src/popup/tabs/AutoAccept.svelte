<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";
  import type { UserSettings } from "$lib/types";
  import { onMount } from "svelte";
  import SwitchSlider from "$lib/components/constants/switch-slider.svelte";

  let {
    autoAccept = $bindable<UserSettings["autoAccept"]>({
      match: false,
      party: false,
    }),
  } = $props();

  // Keep track of previous values to detect changes
  let previousMatch = false;
  let previousParty = false;

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

    // Check if settings were changed in any way
    const matchChanged = previousMatch !== autoAccept.match;
    const partyChanged = previousParty !== autoAccept.party;

    // Update previous values
    previousMatch = autoAccept.match;
    previousParty = autoAccept.party;

    // If either setting was changed, force reload
    if (matchChanged || partyChanged) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "forceReload",
            reason: matchChanged
              ? autoAccept.match
                ? "match_auto_accept_enabled"
                : "match_auto_accept_disabled"
              : autoAccept.party
                ? "party_auto_accept_enabled"
                : "party_auto_accept_disabled",
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
    descriptionText2="Number of seconds to wait before accepting matches automatically."

  />
  <h2 class="text-lg">Lobby invite</h2>
  <SwitchSlider
    labelText="Lobby invite"
    descriptionText="Auto-accept new lobby invitations"
    labelText2="Delay"
    descriptionText2="Number of seconds to wait before accepting lobby invitations automatically."

  />
  <SwitchComponent
    labelText="Match found"
    descriptionText="Auto-accept new matches"
    switchId="match-found"
    bind:checked={autoAccept.match}
  />
  <SwitchComponent
    labelText="Lobby invite"
    descriptionText="Auto-accept new lobby invitations"
    switchId="lobby-invite"
    bind:checked={autoAccept.party}
  />
</main>

<style></style>
