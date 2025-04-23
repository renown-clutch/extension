<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";

  let {
    profileButtons = $bindable({
      csstats: false,
      faceit: false,
    }),
    showBans = $bindable(false),
    showSkinDrops = $bindable(false),
    showFriendListRanks = $bindable(false),
    sortFriendsByRenownElo = $bindable(false),
  } = $props();

  let previousProfileButtons = { ...profileButtons };

  function sendReloadMessage() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  }

  $effect(() => {
    if (
      previousProfileButtons.csstats !== profileButtons.csstats ||
      previousProfileButtons.faceit !== profileButtons.faceit
    ) {
      sendReloadMessage();
    }
    previousProfileButtons = { ...profileButtons };
  });
</script>

<main class="flex flex-col gap-4">
  <h2 class="text-lg">Profiles</h2>
  <SwitchComponent
    labelText="CSStats Profiles"
    descriptionText="Show CSStats profile button"
    bind:checked={profileButtons.csstats}
  />
  <SwitchComponent
    labelText="Faceit Profiles"
    descriptionText="Show Faceit profile button"
    bind:checked={profileButtons.faceit}
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
    labelText="Sort Friends by Renown Ranks"
    descriptionText={showFriendListRanks
      ? "Sort friends by Renown Ranks (highest first)"
      : "Enable Friend List Ranks to use this feature"}
    bind:checked={sortFriendsByRenownElo}
    disabled={!showFriendListRanks}
    warn={!showFriendListRanks}
  />
</main>
