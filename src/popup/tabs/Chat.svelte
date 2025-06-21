<script lang="ts">
  import SwitchComponent from "$system/components/constants/switch.svelte";
  import { SETTING_DEFINITIONS } from "$system/lib/types";
  import type { UserSettings } from "$system/lib/types";

  let {
    showChatWindow = $bindable<UserSettings["showChatWindow"]>(
      SETTING_DEFINITIONS.showChatWindow.defaultValue
    ),
  } = $props();
</script>

<main class="flex flex-col gap-4">
  <SwitchComponent
    labelText="Chat Window"
    descriptionText={SETTING_DEFINITIONS.showChatWindow.description}
    bind:checked={showChatWindow}
  />
</main>
