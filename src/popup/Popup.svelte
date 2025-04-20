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
  let previousSettings: UserSettings = { ...defaultUserSettings };

  function sendSettingsToContentScript(changedParts?: Partial<UserSettings>) {
    console.log("Sending settings to content script");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "settingsUpdate",
          settings: userSettings,
          changedParts: changedParts || userSettings,
        });
      }
    });
  }

  function detectChanges(): Partial<UserSettings> {
    const changes: Partial<UserSettings> = {};

    // Check for theme changes
    if (previousSettings.selectedTheme !== userSettings.selectedTheme) {
      changes.selectedTheme = userSettings.selectedTheme;
    }

    // Check for profile button changes
    if (
      JSON.stringify(previousSettings.profileButtons) !==
        JSON.stringify(userSettings.profileButtons) ||
      previousSettings.showBans !== userSettings.showBans ||
      previousSettings.showSkinDrops !== userSettings.showSkinDrops
    ) {
      changes.profileButtons = { ...userSettings.profileButtons };
      changes.showBans = userSettings.showBans;
      changes.showSkinDrops = userSettings.showSkinDrops;
    }

    // Check for auto-accept changes
    if (
      JSON.stringify(previousSettings.autoAccept) !==
      JSON.stringify(userSettings.autoAccept)
    ) {
      changes.autoAccept = { ...userSettings.autoAccept };
    }

    // Check for keep alive changes
    if (previousSettings.keepAlive !== userSettings.keepAlive) {
      changes.keepAlive = userSettings.keepAlive;
    }

    return changes;
  }

  onMount(() => {
    chrome.storage.local.get("userSettings", (result) => {
      // Use untrack to prevent this state update from triggering the effect
      untrack(() => {
        userSettings = result.userSettings || defaultUserSettings;
        previousSettings = { ...userSettings };
        Object.keys(defaultUserSettings).forEach((key) => {
          if (!(key in result.userSettings)) {
            (userSettings as any)[key] = (defaultUserSettings as any)[key];
          }
        });
      });
    });
  });

  $effect(() => {
    // Save to chrome.storage.local for persistence
    chrome.storage.local.set({ userSettings });

    // Detect what changes were made
    const changes = detectChanges();

    // Only send changes if there are any
    if (Object.keys(changes).length > 0) {
      sendSettingsToContentScript(changes);
      // Update previous settings to current
      previousSettings = { ...userSettings };
    }
  });
</script>

<main class="w-[600px] bg-slate-950">
  <div class="flex">
    <Sidebar bind:activeTab={userSettings.activeTab} />

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
        <ProfilesTab
          bind:profileButtons={userSettings.profileButtons}
          bind:showBans={userSettings.showBans}
          bind:showSkinDrops={userSettings.showSkinDrops}
        />
      {:else if userSettings.activeTab === "Settings"}
        <SettingsTab bind:keepAlive={userSettings.keepAlive} />
      {/if}
    </div>
  </div>
</main>

<style>
</style>
