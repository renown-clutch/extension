<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";

  let { showConfirmModal = $bindable(false), profileButtons = $bindable({}) } =
    $props();

  let switchId = "test-confirm-modal-switch";
  let previousProfileButtons = { ...profileButtons };

  async function sendMessageToContent(newState: boolean) {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    await chrome.tabs.sendMessage(tabs[0].id!, {
      type: "toggleConfirmModal",
      show: showConfirmModal,
    });
  }

  function sendReloadMessage() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  }

  $effect(() => {
    sendMessageToContent(showConfirmModal);
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
    labelText="Test Confirm Modal"
    descriptionText="Show match confirmation popup on page for testing"
    {switchId}
    bind:checked={showConfirmModal}
  />
  <SwitchComponent
    labelText="CSStats Profile Button"
    descriptionText="Show CSStats profile button on page"
    {switchId}
    bind:checked={profileButtons.csstats}
  />
  <SwitchComponent
    labelText="Faceit Profile Button"
    descriptionText="Show Faceit profile button on page"
    {switchId}
    bind:checked={profileButtons.faceit}
  />
</main>
