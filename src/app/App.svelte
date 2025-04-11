<script lang="ts">
  import "./app.css";
  import Header from "$lib/components/layout/Header.svelte";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
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

  // onMount(() => {
  //   chrome.storage.sync.get(["styleEnabled"], (result) => {
  //     enabled = result.styleEnabled || false;
  //   });
  // });
</script>

<main class="w-[600px] bg-slate-950">
  <Header />
  <Sidebar />
</main>

<style>
</style>
