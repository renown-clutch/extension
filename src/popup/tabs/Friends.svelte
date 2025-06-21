<script lang="ts">
  import SwitchComponent from "$system/components/constants/switch.svelte";

  let {
    showFriendListRanks = $bindable(false),
    sortFriendsByRenownElo = $bindable(false),
    showSidebarFriendRanks = $bindable(false),
  } = $props();

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
        if (
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

    previousSortFriendsByRenownElo = sortFriendsByRenownElo;
  });
</script>

<main class="flex flex-col gap-4">
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
  <SwitchComponent
    labelText="Ranks in Sidebar"
    descriptionText="Show Friend's Renown Ranks in Sidebar"
    bind:checked={showSidebarFriendRanks}
  />
</main>
