<script lang="ts">
  import "./Popup.css";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import SoundTab from "./tabs/Sound.svelte";
  import ThemeTab from "./tabs/Theme.svelte";
  import ProfilesTab from "./tabs/Profiles.svelte";
  import AutoAcceptTab from "./tabs/AutoAccept.svelte";
  import SettingsTab from "./tabs/Settings.svelte";
  import { onMount, untrack } from "svelte";
  import type { UserSettings } from "$lib/types";
  import { defaultUserSettings } from "$lib/types";

  let userSettings: UserSettings = $state<UserSettings>(defaultUserSettings);

  onMount(() => {
    chrome.storage.local.get("userSettings", (result) => {
      // Use untrack to prevent this state update from triggering the effect
      untrack(() => {
        userSettings = result.userSettings || defaultUserSettings;
        Object.keys(defaultUserSettings).forEach((key) => {
          if (!(key in result.userSettings)) {
            (userSettings as any)[key] = (defaultUserSettings as any)[key];
          }
        });
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
        <AutoAcceptTab bind:autoAccept={userSettings.autoAccept} />
      {:else if userSettings.activeTab === "Map voting"}
        <div class="py-2">
          <h2 class="text-xl font-medium mb-4">Map Voting</h2>
          <p>Map voting settings will be available soon.</p>
        </div>
      {:else if userSettings.activeTab === "Sounds"}
        <SoundTab />
      {:else if userSettings.activeTab === "Profiles"}
        <ProfilesTab bind:profileButtons={userSettings.profileButtons} />
      {:else if userSettings.activeTab === "Settings"}
        <SettingsTab bind:showConfirmModal={userSettings.showConfirmModal} />
      {/if}
    </div>
  </div>
</main>

<style>
</style>
