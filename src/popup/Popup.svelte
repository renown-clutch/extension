<script lang="ts">
  import "./Popup.css";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import SoundTab from "./tabs/Sound.svelte";
  import ThemeTab from "./tabs/Theme.svelte";
  import ProfilesTab from "./tabs/Profiles.svelte";
  import AutoAcceptTab from "./tabs/AutoAccept.svelte";
  import SettingsTab from "./tabs/Settings.svelte";
  import MatchTab from "./tabs/Match.svelte";
  import { onMount, untrack } from "svelte";
  import type { UserSettings } from "$lib/types";
  import { defaultUserSettings } from "$lib/types";

  let userSettings: UserSettings = $state<UserSettings>(defaultUserSettings);
  let previousSettings: UserSettings = { ...defaultUserSettings };

  function sendSettingsToContentScript(changedParts?: Partial<UserSettings>) {
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

    if (previousSettings.selectedTheme !== userSettings.selectedTheme) {
      changes.selectedTheme = userSettings.selectedTheme;
    }

    if (
      previousSettings.csstatsProfileButton !==
      userSettings.csstatsProfileButton
    ) {
      changes.csstatsProfileButton = userSettings.csstatsProfileButton;
    }

    if (
      previousSettings.faceitProfileButton !== userSettings.faceitProfileButton
    ) {
      changes.faceitProfileButton = userSettings.faceitProfileButton;
    }

    if (previousSettings.showBans !== userSettings.showBans) {
      changes.showBans = userSettings.showBans;
    }

    if (previousSettings.showSkinDrops !== userSettings.showSkinDrops) {
      changes.showSkinDrops = userSettings.showSkinDrops;
    }

    if (
      JSON.stringify(previousSettings.autoAccept) !==
      JSON.stringify(userSettings.autoAccept)
    ) {
      changes.autoAccept = { ...userSettings.autoAccept };
    }

    if (
      previousSettings.matchAutoAcceptDelay !==
      userSettings.matchAutoAcceptDelay
    ) {
      changes.matchAutoAcceptDelay = userSettings.matchAutoAcceptDelay;
    }

    if (
      previousSettings.partyAutoAcceptDelay !==
      userSettings.partyAutoAcceptDelay
    ) {
      changes.partyAutoAcceptDelay = userSettings.partyAutoAcceptDelay;
    }

    if (previousSettings.keepAlive !== userSettings.keepAlive) {
      changes.keepAlive = userSettings.keepAlive;
    }

    if (
      previousSettings.showFriendListRanks !== userSettings.showFriendListRanks
    ) {
      changes.showFriendListRanks = userSettings.showFriendListRanks;
    }

    if (
      previousSettings.showFaceitRanksOnMatchPage !==
      userSettings.showFaceitRanksOnMatchPage
    ) {
      changes.showFaceitRanksOnMatchPage =
        userSettings.showFaceitRanksOnMatchPage;
    }

    if (
      previousSettings.sortFriendsByRenownElo !==
      userSettings.sortFriendsByRenownElo
    ) {
      changes.sortFriendsByRenownElo = userSettings.sortFriendsByRenownElo;
    }

    if (
      previousSettings.showSidebarFriendRanks !==
      userSettings.showSidebarFriendRanks
    ) {
      changes.showSidebarFriendRanks = userSettings.showSidebarFriendRanks;
    }

    if (
      previousSettings.showExtensionNavbarButton !==
      userSettings.showExtensionNavbarButton
    ) {
      changes.showExtensionNavbarButton =
        userSettings.showExtensionNavbarButton;
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
          if (result.userSettings && !(key in result.userSettings)) {
            (userSettings as any)[key] = (defaultUserSettings as any)[key];
          }
        });
      });
    });
  });

  $effect(() => {
    chrome.storage.local.set({ userSettings });

    const changes = detectChanges();

    if (Object.keys(changes).length > 0) {
      sendSettingsToContentScript(changes);
      previousSettings = { ...userSettings };
    }
  });
</script>

<main class="w-[600px] bg-slate-950">
  <div class="flex h-[440px]">
    <Sidebar bind:activeTab={userSettings.activeTab} />

    <div class="flex-1 p-8 overflow-y-auto">
      {#if userSettings.activeTab === "Theme"}
        <ThemeTab bind:selectedTheme={userSettings.selectedTheme} />
      {:else if userSettings.activeTab === "Auto-accept"}
        <AutoAcceptTab
          bind:autoAccept={userSettings.autoAccept}
          bind:matchAutoAcceptDelay={userSettings.matchAutoAcceptDelay}
          bind:partyAutoAcceptDelay={userSettings.partyAutoAcceptDelay}
        />
      {:else if userSettings.activeTab === "Match"}
        <MatchTab
          bind:showFaceitRanksOnMatchPage={
            userSettings.showFaceitRanksOnMatchPage
          }
        />
      {:else if userSettings.activeTab === "Sounds"}
        <SoundTab />
      {:else if userSettings.activeTab === "Profiles"}
        <ProfilesTab
          bind:csstatsProfileButton={userSettings.csstatsProfileButton}
          bind:faceitProfileButton={userSettings.faceitProfileButton}
          bind:showBans={userSettings.showBans}
          bind:showSkinDrops={userSettings.showSkinDrops}
          bind:showFriendListRanks={userSettings.showFriendListRanks}
          bind:sortFriendsByRenownElo={userSettings.sortFriendsByRenownElo}
          bind:showSidebarFriendRanks={userSettings.showSidebarFriendRanks}
        />
      {:else if userSettings.activeTab === "Settings"}
        <SettingsTab
          bind:keepAlive={userSettings.keepAlive}
          bind:showExtensionNavbarButton={
            userSettings.showExtensionNavbarButton
          }
        />
      {/if}
    </div>
  </div>
</main>

<style>
</style>
