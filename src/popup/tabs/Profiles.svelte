<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";

  let {
    csstatsProfileButton = $bindable(false),
    faceitProfileButton = $bindable(false),
    showBans = $bindable(false),
    showSkinDrops = $bindable(false),
    showFriendListRanks = $bindable(false),
    sortFriendsByRenownElo = $bindable(false),
  } = $props();

  let previousCsstatsProfileButton = csstatsProfileButton;
  let previousFaceitProfileButton = faceitProfileButton;
  let previousSortFriendsByRenownElo = sortFriendsByRenownElo;

  function sendReloadMessage(feature: string) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id && tabs[0].url) {
        const url = tabs[0].url;

        // Profile features should only reload on profile pages
        if (
          (feature === "csstats" || feature === "faceit") &&
          url.match(/renown\.gg\/profile\/[^\/]+/)
        ) {
          chrome.tabs.reload(tabs[0].id);
        }

        // Sort friends should only reload on the friends page
        else if (
          feature === "sortFriends" &&
          url.match(/renown\.gg\/profile\/[^\/]+\/friends/)
        ) {
          chrome.tabs.reload(tabs[0].id);
        }
      }
    });
  }

  $effect(() => {
    if (
      previousCsstatsProfileButton === true &&
      csstatsProfileButton === false
    ) {
      sendReloadMessage("csstats");
    }

    if (previousFaceitProfileButton === true && faceitProfileButton === false) {
      sendReloadMessage("faceit");
    }

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
  <h2 class="text-lg">Profiles</h2>
  <SwitchComponent
    labelText="CSStats Profiles"
    descriptionText="Show CSStats profile button"
    bind:checked={csstatsProfileButton}
  />
  <SwitchComponent
    labelText="Faceit Profiles"
    descriptionText="Show Faceit profile button"
    bind:checked={faceitProfileButton}
  />
  <h2 class="text-lg">Bans</h2>
  <SwitchComponent
    labelText="Show previous Bans"
    descriptionText="Show all previous bans for the player"
    bind:checked={showBans}
  />
  <h2 class="text-lg">Skins</h2>
  <SwitchComponent
    labelText="Show all Skin Drops"
    descriptionText="Show all skin drops that the player has received"
    bind:checked={showSkinDrops}
  />
  <h2 class="text-lg">Friend List</h2>
  <SwitchComponent
    labelText="Friend List Ranks"
    descriptionText="Show Friend's Renown Ranks in Friend List"
    bind:checked={showFriendListRanks}
  />
  <SwitchComponent
    labelText="Sort Friends by Elo"
    descriptionText={showFriendListRanks
      ? "Sort friends by Elo (highest first)"
      : "Enable Friend List Ranks to use this feature"}
    bind:checked={sortFriendsByRenownElo}
    disabled={!showFriendListRanks}
    warn={!showFriendListRanks}
  />
</main>
