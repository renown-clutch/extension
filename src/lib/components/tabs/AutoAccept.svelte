<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";
</script>

<main class=" flex flex-col gap-4">
  <!-- <Headline
    text="Auto-accepts match found pop-ups and lobby invites on renown to save time and keep you in the action."
  /> -->

  <SwitchComponent
    labelText="Match found"
    descriptionText="Auto-accept new matches"
    switchId="match-found"
  />
  <SwitchComponent
    labelText="Lobby invite"
    descriptionText="Auto-accept new lobby invitations"
    switchId="lobby-invite"
  />
</main>

<style></style>
