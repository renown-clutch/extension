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

  let previousMatch = defaultUserSettings.autoAccept.match;
  let previousParty = defaultUserSettings.autoAccept.party;

  onMount(() => {
    previousMatch = autoAccept.match;
    previousParty = autoAccept.party;
  });

  $effect(() => {
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
      forceReload();
    }
  });

  function forceReload() {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "forceReload",
          });
        }
      });
    } else if (typeof browser !== "undefined" && browser.tabs) {
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, {
            type: "forceReload",
          });
        }
      });
    }
  }
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
