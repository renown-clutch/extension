<script lang="ts">
  import "./Popup.css";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import SoundTab from "./tabs/Sound.svelte";
  import ThemeTab from "./tabs/Theme.svelte";
  import ProfilesTab from "./tabs/Profiles.svelte";
  import FriendsTab from "./tabs/Friends.svelte";
  import AutoAcceptTab from "./tabs/AutoAccept.svelte";
  import SettingsTab from "./tabs/Settings.svelte";
  import MatchTab from "./tabs/Match.svelte";
  import MainPageTab from "./tabs/MainPage.svelte";
  import { onMount, untrack } from "svelte";
  import type { UserSettings } from "$lib/types";
  import { defaultUserSettings } from "$lib/types";
  import browserAPI from "$lib/browserAPI";

  let userSettings: UserSettings = $state<UserSettings>(defaultUserSettings);
  let previousSettings: UserSettings = { ...defaultUserSettings };

  function stripProxies(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  function sendSettingsToContentScript(changedParts?: Partial<UserSettings>) {
    try {
      const settingsToSend = stripProxies(userSettings);
      const changedPartsToSend = changedParts
        ? stripProxies(changedParts)
        : settingsToSend;

      if (typeof browser !== "undefined" && browser.tabs) {
        browser.tabs
          .query({ active: true, currentWindow: true })
          .then((tabs) => {
            if (tabs[0]?.id) {
              browser.tabs.sendMessage(tabs[0].id, {
                type: "settingsUpdate",
                settings: settingsToSend,
                changedParts: changedPartsToSend,
              });
            }
          });
      } else if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "settingsUpdate",
              settings: settingsToSend,
              changedParts: changedPartsToSend,
            });
          }
        });
      }
    } catch (error) {
      console.error("Error sending settings to content script:", error);
    }
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
      previousSettings.showTeamAverageElo !== userSettings.showTeamAverageElo
    ) {
      changes.showTeamAverageElo = userSettings.showTeamAverageElo;
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

    if (previousSettings.showHighestElo !== userSettings.showHighestElo) {
      changes.showHighestElo = userSettings.showHighestElo;
    }

    if (previousSettings.matchFoundSound !== userSettings.matchFoundSound) {
      changes.matchFoundSound = userSettings.matchFoundSound;
    }

    if (previousSettings.matchFoundVolume !== userSettings.matchFoundVolume) {
      changes.matchFoundVolume = userSettings.matchFoundVolume;
    }

    if (previousSettings.showMapStats !== userSettings.showMapStats) {
      changes.showMapStats = userSettings.showMapStats;
    }

    if (
      previousSettings.showMapStatsColors !== userSettings.showMapStatsColors
    ) {
      changes.showMapStatsColors = userSettings.showMapStatsColors;
    }

    if (
      previousSettings.liveMatchPlayerStats !==
      userSettings.liveMatchPlayerStats
    ) {
      changes.liveMatchPlayerStats = userSettings.liveMatchPlayerStats;
    }

    if (
      previousSettings.showLiveMatchPlayerStreak !==
      userSettings.showLiveMatchPlayerStreak
    ) {
      changes.showLiveMatchPlayerStreak =
        userSettings.showLiveMatchPlayerStreak;
    }

    if (
      previousSettings.showLastPlayedMatches !==
      userSettings.showLastPlayedMatches
    ) {
      changes.showLastPlayedMatches = userSettings.showLastPlayedMatches;
    }

    if (
      previousSettings.showLinkToCurrentMatch !==
      userSettings.showLinkToCurrentMatch
    ) {
      changes.showLinkToCurrentMatch = userSettings.showLinkToCurrentMatch;
    }

    if (
      previousSettings.showAveragePartyElo !== userSettings.showAveragePartyElo
    ) {
      changes.showAveragePartyElo = userSettings.showAveragePartyElo;
    }

    if (
      previousSettings.showFaceitEloOnPartyList !==
      userSettings.showFaceitEloOnPartyList
    ) {
      changes.showFaceitEloOnPartyList = userSettings.showFaceitEloOnPartyList;
    }

    return changes;
  }

  onMount(async () => {
    try {
      let settings;

      if (typeof browser !== "undefined" && browser.storage) {
        const result = await browser.storage.local.get("userSettings");
        settings = result.userSettings;
      } else {
        const result = (await browserAPI.storage.local.get("userSettings")) as {
          userSettings?: UserSettings;
        };
        settings = result.userSettings;
      }

      untrack(() => {
        if (settings) {
          userSettings = settings;
          previousSettings = { ...settings };

          Object.keys(defaultUserSettings).forEach((key) => {
            if (!(key in userSettings)) {
              (userSettings as any)[key] = (defaultUserSettings as any)[key];
            }
          });
        } else {
          userSettings = defaultUserSettings;
          previousSettings = { ...defaultUserSettings };
        }
      });

      console.log("Loaded settings:", userSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  });

  $effect(() => {
    try {
      const settingsToStore = stripProxies(userSettings);

      if (typeof browser !== "undefined" && browser.storage) {
        browser.storage.local
          .set({ userSettings: settingsToStore })
          .catch((error) => {
            console.error("Error saving settings to Firefox storage:", error);
          });
      } else {
        browserAPI.storage.local.set({ userSettings: settingsToStore });
      }

      const changes = detectChanges();

      if (Object.keys(changes).length > 0) {
        sendSettingsToContentScript(changes);
        previousSettings = stripProxies(userSettings);
      }
    } catch (error) {
      console.error("Error in settings effect:", error);
    }
  });
</script>

<main class="w-[600px] bg-slate-950">
  <div class="flex h-[480px]">
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
          bind:showTeamAverageElo={userSettings.showTeamAverageElo}
          bind:showMapStats={userSettings.showMapStats}
          bind:showMapStatsColors={userSettings.showMapStatsColors}
          bind:liveMatchPlayerStats={userSettings.liveMatchPlayerStats}
          bind:showLiveMatchPlayerStreak={
            userSettings.showLiveMatchPlayerStreak
          }
        />
      {:else if userSettings.activeTab === "Sounds"}
        <SoundTab
          bind:matchFoundSound={userSettings.matchFoundSound}
          bind:matchFoundVolume={userSettings.matchFoundVolume}
        />
      {:else if userSettings.activeTab === "Profiles"}
        <ProfilesTab
          bind:csstatsProfileButton={userSettings.csstatsProfileButton}
          bind:faceitProfileButton={userSettings.faceitProfileButton}
          bind:showBans={userSettings.showBans}
          bind:showHighestElo={userSettings.showHighestElo}
          bind:showLinkToCurrentMatch={userSettings.showLinkToCurrentMatch}
        />
      {:else if userSettings.activeTab === "Settings"}
        <SettingsTab
          bind:keepAlive={userSettings.keepAlive}
          bind:showExtensionNavbarButton={
            userSettings.showExtensionNavbarButton
          }
        />
      {:else if userSettings.activeTab === "Friends"}
        <FriendsTab
          bind:showFriendListRanks={userSettings.showFriendListRanks}
          bind:sortFriendsByRenownElo={userSettings.sortFriendsByRenownElo}
          bind:showSidebarFriendRanks={userSettings.showSidebarFriendRanks}
        />
      {:else if userSettings.activeTab === "MainPage"}
        <MainPageTab
          bind:showLastPlayedMatches={userSettings.showLastPlayedMatches}
          bind:showAveragePartyElo={userSettings.showAveragePartyElo}
          bind:showFaceitEloOnPartyList={userSettings.showFaceitEloOnPartyList}
        />
      {/if}
    </div>
  </div>
</main>

<style>
</style>
