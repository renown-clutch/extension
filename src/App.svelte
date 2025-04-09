<script lang="ts">
  import "./app.css";
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label/index.js";
  import { onMount } from "svelte";

  let enabled = $state(false);

  // Send message to content script when switch is toggled
  function handleToggle() {
    enabled = !enabled;
    // Save state to Chrome storage
    chrome.storage.sync.set({ styleEnabled: enabled });
    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "toggleStyle",
          enabled: enabled,
        });
      }
    });
  }

  // Load saved state from Chrome storage
  onMount(() => {
    chrome.storage.sync.get(["styleEnabled"], (result) => {
      enabled = result.styleEnabled || false;
    });
  });
</script>

<main>
  <div class="m-4 gap-2">
    <Label for="test">Custom style for Renown.gg</Label>
    <Switch id="test" checked={enabled} onCheckedChange={handleToggle} />
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>
