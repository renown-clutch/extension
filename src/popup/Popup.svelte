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
  import ChatTab from "./tabs/Chat.svelte";
  import { onMount, untrack } from "svelte";
  import type { UserSettings } from "$lib/types";
  import { defaultUserSettings, SETTING_DEFINITIONS } from "$lib/types";
  import browserAPI from "$lib/browserAPI";
  // import { initializePopupTheme, switchPopupTheme } from "../themes/themeUtils";

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

    Object.entries(SETTING_DEFINITIONS).forEach(([key, def]) => {
      const currentValue = userSettings[key as keyof UserSettings];
      const previousValue = previousSettings[key as keyof UserSettings];

      if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
        (changes as any)[key] = currentValue;
      }
    });

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

      console.log("Loaded settings:", settings);

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

      // if (userSettings.selectedTheme) {
      //   await initializePopupTheme(userSettings.selectedTheme);
      // }

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
        if (changes.selectedTheme) {
          // switchPopupTheme(changes.selectedTheme);
        }

        sendSettingsToContentScript(changes);
        previousSettings = stripProxies(userSettings);
      }
    } catch (error) {
      console.error("Error in settings effect:", error);
    }
  });
</script>

<main class="w-[620px] popup-root">
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
      {:else if userSettings.activeTab === "Chat"}
        <ChatTab bind:showChatWindow={userSettings.showChatWindow} />
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
  .popup-root {
    background-color: var(--slate-950);
  }
</style>
