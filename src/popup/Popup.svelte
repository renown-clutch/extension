<script lang="ts">
  import "./Popup.css";
  import Header from "$lib/components/layout/Header.svelte";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import { onMount } from "svelte";

  let activeTab = $state("Theme");
  let isInitialized = $state(false);

  onMount(() => {
    chrome.storage.local.get("activeTab", (result) => {
      activeTab = result.activeTab || "Theme";
      isInitialized = true;
    });
  });

  $effect(() => {
    if (isInitialized) {
      chrome.storage.local.set({ activeTab });
    } else {
      console.log("not initialized, ignoring");
    }
  });
</script>

<main class="w-[600px] bg-slate-950">
  <Header />
  <Sidebar bind:activeTab />
</main>

<style>
</style>
