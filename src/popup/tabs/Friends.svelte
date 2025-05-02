<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";
  import browserAPI from "$lib/browserAPI";

  let {
    csstatsProfileButton = $bindable(false),
    faceitProfileButton = $bindable(false),
    showBans = $bindable(false),
    showSkinDrops = $bindable(false),
    showFriendListRanks = $bindable(false),
    sortFriendsByRenownElo = $bindable(false),
    showSidebarFriendRanks = $bindable(false),
    showHighestElo = $bindable(false),
  } = $props();

  let previousCsstatsProfileButton = csstatsProfileButton;
  let previousFaceitProfileButton = faceitProfileButton;
  let previousSortFriendsByRenownElo = sortFriendsByRenownElo;

  function reloadPage() {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
    } else if (typeof browser !== "undefined" && browser.tabs) {
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]?.id) {
          browser.tabs.reload(tabs[0].id);
        }
      });
    }
  }

  function sendReloadMessage(feature: string) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id && tabs[0].url) {
        const url = tabs[0].url;

        // Profile features should only reload on profile pages
        if (
          (feature === "csstats" || feature === "faceit") &&
          url.match(/renown\.gg\/profile\/[^\/]+/)
        ) {
          reloadPage();
        }

        // Sort friends should only reload on the friends page
        else if (
          feature === "sortFriends" &&
          url.match(/renown\.gg\/profile\/[^\/]+\/friends/)
        ) {
          reloadPage();
        }
      }
    });
  }

  $effect(() => {
    if (
      previousSortFriendsByRenownElo === true &&
      sortFriendsByRenownElo === false
    ) {
      sendReloadMessage("sortFriends");
    }

    previousCsstatsProfileButton = csstatsProfileButton;
    previousFaceitProfileButton = faceitProfileButton;
    previousSortFriendsByRenownElo = sortFriendsByRenownElo;
  });
</script>

<main class="flex flex-col gap-4">
  <h2 class="text-lg">Buttons</h2>
  <SwitchComponent
    labelText="CSStats Button"
    descriptionText="Show CSStats profile button"
    bind:checked={csstatsProfileButton}
  />
  <SwitchComponent
    labelText="Faceit Button"
    descriptionText="Show Faceit profile button"
    bind:checked={faceitProfileButton}
  />
  <h2 class="text-lg">Profile</h2>
  <SwitchComponent
    labelText="Highest ELO"
    descriptionText="Show player's highest ELO in their profile"
    bind:checked={showHighestElo}
  />
  <h2 class="text-lg">Bans</h2>
  <SwitchComponent
    labelText="Ban History"
    descriptionText="Show previous bans of the player in the profile"
    bind:checked={showBans}
  />
  <h2 class="text-lg">Drops</h2>
  <SwitchComponent
    labelText="Skin Drops"
    descriptionText="Show all skin drops that player has received"
    bind:checked={showSkinDrops}
  />
  <h2 class="text-lg">Friend List</h2>
  <SwitchComponent
    labelText="Ranks in Friends List "
    descriptionText="Show Friend's Renown Ranks in Friend List"
    bind:checked={showFriendListRanks}
  />
  <SwitchComponent
    labelText="Sort Friends List"
    descriptionText={showFriendListRanks
      ? "Sort friends by Elo (highest first)"
      : "Enable Ranks in Friends List to use this feature"}
    bind:checked={sortFriendsByRenownElo}
    disabled={!showFriendListRanks}
    warn={!showFriendListRanks}
  />
  <h2 class="text-lg">Sidebar</h2>
  <SwitchComponent
    labelText="Ranks in Sidebar"
    descriptionText="Show Friend's Renown Ranks in Sidebar"
    bind:checked={showSidebarFriendRanks}
  />
</main>
