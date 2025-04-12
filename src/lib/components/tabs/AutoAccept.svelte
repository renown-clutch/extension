<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import DiscriptionButton from "$lib/components/constants/discriptionButton.svelte";
  import SwitchComponent from "$lib/components/constants/switch.svelte";
</script>

<main class=" flex flex-col gap-4">
  <!-- <Headline
    text="Auto-accepts match found pop-ups and lobby invites on renown to save time and keep you in the action."
  /> -->

  <SwitchComponent
    labelText="Match found"
    descriptionText="Auto-accept new matches"
    switchId="airplane-mode"
  />
  <SwitchComponent
    labelText="Lobby invite"
    descriptionText="Auto-accept new lobby invitations"
    switchId="airplane-mode"
  />
</main>

<style></style>
