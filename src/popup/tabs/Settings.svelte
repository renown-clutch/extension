<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";

  let { showConfirmModal = $bindable(false), keepAlive = $bindable(false) } =
    $props();

  let switchId = "test-confirm-modal-switch";

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

  $effect(() => {
    sendMessageToContent(showConfirmModal);
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
    labelText="Keep Alive"
    descriptionText="Keep the renown page alive to prevent it from sleeping"
    {switchId}
    bind:checked={keepAlive}
  />
</main>
