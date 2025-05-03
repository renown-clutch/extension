<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";
  import { onMount } from "svelte";

  let {
    keepAlive = $bindable(false),
    showExtensionNavbarButton = $bindable(false),
  } = $props();

  let keepAliveSwitchId = "keep-alive-switch";
  let extensionButtonSwitchId = "extension-button-switch";

  let isFirefox = $state(false);
  let navbarFeatureDisabled = $state(false);

  onMount(() => {
    isFirefox = typeof browser !== "undefined";
    navbarFeatureDisabled = isFirefox;

    if (isFirefox) {
      showExtensionNavbarButton = false;
    }
  });
</script>

<main class="flex flex-col h-full">
  <div class="flex flex-col gap-4">
    <SwitchComponent
      labelText="Keep Alive"
      descriptionText="Keep the renown page alive to prevent it from sleeping"
      switchId={keepAliveSwitchId}
      bind:checked={keepAlive}
    />
    <SwitchComponent
      labelText="Clutch Navbar Link"
      descriptionText={isFirefox
        ? "This feature is not available in Firefox due to browser limitations"
        : "Show a Clutch link in the navbar to open the extension popup"}
      switchId={extensionButtonSwitchId}
      bind:checked={showExtensionNavbarButton}
      disabled={navbarFeatureDisabled}
    />
  </div>

  <footer class="mt-auto pt-4 flex justify-between items-center">
    <div>
      <p class="capitalize text-slate-400 text-xs">Version 1.0.5</p>
    </div>
  </footer>
</main>
