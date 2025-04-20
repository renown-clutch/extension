<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";

  let { profileButtons = $bindable({}) } = $props();

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
  <SwitchComponent
    labelText="CSStats Profile Button"
    descriptionText="Show CSStats profile button on page"
    bind:checked={profileButtons.csstats}
  />
  <SwitchComponent
    labelText="Faceit Profile Button"
    descriptionText="Show Faceit profile button on page"
    bind:checked={profileButtons.faceit}
  />
</main>
