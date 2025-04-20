<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";

  let showModal = $state(false);
  let switchId = "test-confirm-modal-switch";

  async function sendMessageToContent(newState: boolean) {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    await chrome.tabs.sendMessage(tabs[0].id!, {
      type: "toggleConfirmModal",
      show: showModal,
    });
  }

  $effect(() => {
    sendMessageToContent(showModal);
  });
</script>

<main class="flex flex-col gap-4">
  <SwitchComponent
    labelText="Test Confirm Modal"
    descriptionText="Show match confirmation popup on page for testing"
    {switchId}
    bind:checked={showModal}
  />
</main>
