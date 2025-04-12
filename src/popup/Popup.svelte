<script lang="ts">
  import "./Popup.css";
  import Header from "$lib/components/layout/Header.svelte";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import ThemeTab from "$lib/components/tabs/Theme.svelte";
  import AutoAcceptTab from "$lib/components/tabs/AutoAccept.svelte";
  import { onMount, untrack } from "svelte";

  type TabName =
    | "Theme"
    | "Auto-accept"
    | "Map voting"
    | "Sounds"
    | "Bans"
    | "Settings";

  type UserSettings = {
    activeTab: TabName;
    selectedTheme: "" | "light" | "dark" | "default";
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
  <div class="flex">
    <Sidebar bind:activeTab={userSettings.activeTab} />

    <!-- Main Content -->
    <div class="flex-1 p-8">
      {#if userSettings.activeTab === "Theme"}
        <ThemeTab bind:selectedTheme={userSettings.selectedTheme} />
      {:else if userSettings.activeTab === "Auto-accept"}
        <AutoAcceptTab />
      {:else if userSettings.activeTab === "Map voting"}
        <div class="py-2">
          <h2 class="text-xl font-medium mb-4">Map Voting</h2>
          <p>Map voting settings will be available soon.</p>
        </div>
      {:else if userSettings.activeTab === "Sounds"}
        <div class="py-2">
          <h2 class="text-xl font-medium mb-4">Sounds</h2>
          <p>Sound settings will be available soon.</p>
        </div>
      {:else if userSettings.activeTab === "Bans"}
        <div class="py-2">
          <h2 class="text-xl font-medium mb-4">Bans</h2>
          <p>Ban settings will be available soon.</p>
        </div>
      {:else if userSettings.activeTab === "Settings"}
        <div class="py-2">
          <h2 class="text-xl font-medium mb-4">Settings</h2>
          <p>General settings will be available soon.</p>
        </div>
      {/if}
    </div>
  </div>
</main>

<style>
</style>
