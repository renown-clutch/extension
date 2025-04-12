<script lang="ts">
  import "./Popup.css";
  import Header from "$lib/components/layout/Header.svelte";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import { onMount, untrack } from "svelte";

  type UserSettings = {
    activeTab: "Theme" | "Auto-accept" | "Bans" | "Settings";
    selectedTheme: "" | "light" | "dark";
  };

  const defaultUserSettings: UserSettings = {
    activeTab: "Theme",
    selectedTheme: "",
  };

  let userSettings = $state<UserSettings>(defaultUserSettings);

  onMount(() => {
    chrome.storage.local.get("userSettings", (result) => {
      // Use untrack to prevent this state update from triggering the effect
      untrack(() => {
        userSettings = result.userSettings || defaultUserSettings;
      });
    });
  });

  $effect(() => {
    chrome.storage.local.set({ userSettings });
  });
</script>

<main class="w-[600px] bg-slate-950">
  <Header />
  <Sidebar bind:activeTab={userSettings.activeTab} />
</main>

<style>
</style>
