<script lang="ts">
  import "./Popup.css";
  import Sidebar from "$system/components/layout/Sidebar.svelte";
  // import SoundTab from "./tabs/Sound.svelte";
  import ThemeTab from "./tabs/Theme.svelte";
  import ProfilesTab from "./tabs/Profiles.svelte";
  import FriendsTab from "./tabs/Friends.svelte";
  import AutoAcceptTab from "./tabs/AutoAccept.svelte";
  import SettingsTab from "./tabs/Settings.svelte";
  import MatchTab from "./tabs/Match.svelte";
  import MainPageTab from "./tabs/MainPage.svelte";
  import ChatTab from "./tabs/Chat.svelte";
  import { onMount, untrack } from "svelte";
  import type { UserSettings } from "$system/lib/types";
  import { defaultUserSettings, SETTING_DEFINITIONS } from "$system/lib/types";
  import browserAPI from "$system/lib/browserAPI";
  import { initializePopupTheme, switchPopupTheme } from "../themes/themeUtils";

  let userSettings = $state<UserSettings>({
    ...defaultUserSettings,
  });
  let previousSettings: UserSettings = { ...defaultUserSettings };
  let activeSection = $state("theme-section");
  let scrollContainer: HTMLElement | null = null;
  let scrollSaveTimeout: number;

  function stripProxies(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  function sendSettingsToContentScript(changedParts?: Partial<UserSettings>) {
    try {
      const settingsToSend = stripProxies(userSettings);
      const changedPartsToSend = changedParts
        ? stripProxies(changedParts)
        : settingsToSend;

      const message = {
        type: "settingsUpdate",
        settings: settingsToSend,
        changedParts: changedPartsToSend,
      };

      if (typeof browser !== "undefined" && browser.tabs) {
        browser.tabs
          .query({ active: true, currentWindow: true })
          .then((tabs) => {
            if (tabs[0]?.id) {
              browser.tabs.sendMessage(tabs[0].id, message).catch((error) => {
                console.log("[Popup] Content script not ready:", error);
              });
            }
          });
      } else if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, message, () => {
              const lastError = chrome.runtime.lastError;
              if (lastError) {
                console.log(
                  "[Popup] Content script not ready:",
                  lastError.message
                );
                return;
              }
              console.log("[Popup] Settings update sent to active tab");
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

  // Save scroll position and active section
  async function saveScrollState() {
    if (!scrollContainer) return;

    const scrollState = {
      scrollPosition: scrollContainer.scrollTop,
      activeSection: activeSection,
    };

    try {
      if (typeof browser !== "undefined" && browser.storage) {
        await browser.storage.local.set({ popupScrollState: scrollState });
      } else {
        await browserAPI.storage.local.set({ popupScrollState: scrollState });
      }
    } catch (error) {
      console.error("Error saving scroll state:", error);
    }
  }

  // Restore scroll position and active section
  async function restoreScrollState() {
    try {
      let result: any;
      if (typeof browser !== "undefined" && browser.storage) {
        result = await browser.storage.local.get("popupScrollState");
      } else {
        result = await browserAPI.storage.local.get("popupScrollState");
      }

      const scrollState = result.popupScrollState;
      if (scrollState && scrollContainer) {
        // Restore scroll position
        scrollContainer.scrollTop = scrollState.scrollPosition || 0;
        // Restore active section
        if (scrollState.activeSection) {
          activeSection = scrollState.activeSection;
        }
      }
    } catch (error) {
      console.error("Error restoring scroll state:", error);
    }
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

      // Use untrack to prevent this state update from triggering the effect
      untrack(() => {
        if (settings) {
          const cleanSettings = JSON.parse(JSON.stringify(settings));
          const mergedSettings = { ...defaultUserSettings, ...cleanSettings };

          userSettings = mergedSettings;
          previousSettings = { ...mergedSettings };
        } else {
          userSettings = { ...defaultUserSettings };
          previousSettings = { ...defaultUserSettings };
        }

        if (userSettings.selectedTheme) {
          initializePopupTheme(userSettings.selectedTheme);
        }
      });

      // Set up scroll container and restore scroll state
      setTimeout(async () => {
        scrollContainer = document.querySelector(".overflow-y-auto");
        if (scrollContainer) {
          await restoreScrollState();

          // Add scroll event listener to save state periodically
          scrollContainer.addEventListener("scroll", () => {
            // Debounce saving to avoid too frequent saves
            clearTimeout(scrollSaveTimeout);
            scrollSaveTimeout = setTimeout(saveScrollState, 300);
          });

          // Signal that scroll restoration is complete
          document.dispatchEvent(new CustomEvent("scrollRestorationComplete"));
        }
      }, 100);
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
          switchPopupTheme(changes.selectedTheme);
        }

        sendSettingsToContentScript(changes);
        previousSettings = stripProxies(userSettings);
      }
    } catch (error) {
      console.error("Error in settings effect:", error);
    }
  });

  // Save scroll state when popup closes or when activeSection changes
  $effect(() => {
    saveScrollState();
  });
</script>

<main class="w-[620px] popup-root">
  <div class="flex h-[480px]">
    <Sidebar bind:activeSection />

    <div class="flex-1 overflow-y-auto">
      <div class="p-8 pb-6 space-y-8">
        <!-- Theme Section -->
        <section id="theme-section" class="scroll-mt-4">
          <ThemeTab bind:selectedTheme={userSettings.selectedTheme} />
        </section>

        <!-- Separator -->
        <div class="border-t border-[var(--slate-800)]"></div>

        <!-- Auto-accept Section -->
        <section id="auto-accept-section" class="scroll-mt-4">
          <AutoAcceptTab
            bind:autoAccept={userSettings.autoAccept}
            bind:matchAutoAcceptDelay={userSettings.matchAutoAcceptDelay}
            bind:partyAutoAcceptDelay={userSettings.partyAutoAcceptDelay}
          />
        </section>

        <!-- Separator -->
        <div class="border-t border-[var(--slate-800)]"></div>

        <!-- Chat Section -->
        <section id="chat-section" class="scroll-mt-4">
          <ChatTab bind:showChatWindow={userSettings.showChatWindow} />
        </section>

        <!-- Separator -->
        <div class="border-t border-[var(--slate-800)]"></div>

        <!-- MainPage Section -->
        <section id="mainpage-section" class="scroll-mt-4">
          <MainPageTab
            bind:showLastPlayedMatches={userSettings.showLastPlayedMatches}
            bind:showAveragePartyElo={userSettings.showAveragePartyElo}
            bind:showFaceitEloOnPartyList={
              userSettings.showFaceitEloOnPartyList
            }
          />
        </section>

        <!-- Separator -->
        <div class="border-t border-[var(--slate-800)]"></div>

        <!-- Match Section -->
        <section id="match-section" class="scroll-mt-4">
          <MatchTab
            bind:showFaceitRanksOnMatchPage={
              userSettings.showFaceitRanksOnMatchPage
            }
            bind:showTeamAverageElo={userSettings.showTeamAverageElo}
            bind:showMapStats={userSettings.showMapStats}
            bind:liveMatchPlayerStats={userSettings.liveMatchPlayerStats}
            bind:showLiveMatchPlayerStreak={
              userSettings.showLiveMatchPlayerStreak
            }
          />
        </section>

        <!-- Separator -->
        <div class="border-t border-[var(--slate-800)]"></div>

        <!-- Sounds Section -->
        <!-- <section id="sounds-section" class="scroll-mt-4">
          <SoundTab
            bind:matchFoundSound={userSettings.matchFoundSound}
            bind:matchFoundVolume={userSettings.matchFoundVolume}
          />
        </section> -->

        <!-- Separator -->
        <div class="border-t border-[var(--slate-800)]"></div>

        <!-- Profiles Section -->
        <section id="profiles-section" class="scroll-mt-4">
          <ProfilesTab
            bind:csstatsProfileButton={userSettings.csstatsProfileButton}
            bind:faceitProfileButton={userSettings.faceitProfileButton}
            bind:showBans={userSettings.showBans}
            bind:showHighestElo={userSettings.showHighestElo}
            bind:showLinkToCurrentMatch={userSettings.showLinkToCurrentMatch}
            bind:playerMatchupStats={userSettings.playerMatchupStats}
          />
        </section>

        <!-- Separator -->
        <div class="border-t border-[var(--slate-800)]"></div>

        <!-- Friends Section -->
        <section id="friends-section" class="scroll-mt-4">
          <FriendsTab
            bind:showFriendListRanks={userSettings.showFriendListRanks}
            bind:sortFriendsByRenownElo={userSettings.sortFriendsByRenownElo}
            bind:showSidebarFriendRanks={userSettings.showSidebarFriendRanks}
          />
        </section>

        <!-- Separator -->
        <div class="border-t border-[var(--slate-800)]"></div>

        <!-- Settings Section -->
        <section id="settings-section" class="scroll-mt-4">
          <SettingsTab
            bind:keepAlive={userSettings.keepAlive}
            bind:showExtensionNavbarButton={
              userSettings.showExtensionNavbarButton
            }
          />
        </section>
      </div>
    </div>
  </div>
</main>

<style>
  .popup-root {
    background-color: var(--slate-950);
  }

  /* Smooth scrolling for the entire popup */
  .popup-root {
    scroll-behavior: smooth;
  }

  /* Custom scrollbar styling */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: var(--slate-600) var(--slate-800);
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: var(--slate-800);
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: var(--slate-600);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: var(--slate-500);
  }
</style>
