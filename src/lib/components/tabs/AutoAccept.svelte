<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";
  import type { UserSettings } from "$lib/types";

  let {
    autoAccept = $bindable<UserSettings["autoAccept"]>({
      match: false,
      party: false,
    }),
  } = $props();
</script>

<main class=" flex flex-col gap-4">
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
