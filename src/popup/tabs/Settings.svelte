<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";

  let {
    showConfirmModal = $bindable(false),
    keepAlive = $bindable(false),
    showInviteModal = $bindable(false),
  } = $props();

  let matchModalSwitchId = "test-confirm-modal-switch";
  let inviteModalSwitchId = "test-invite-modal-switch";
  let keepAliveSwitchId = "keep-alive-switch";
  async function sendMessageToContent(newState: boolean, type: string) {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    await chrome.tabs.sendMessage(tabs[0].id!, {
      type,
      show: newState,
    });
  }

  $effect(() => {
    sendMessageToContent(showConfirmModal, "toggleConfirmModal");
  });

  $effect(() => {
    sendMessageToContent(showInviteModal, "toggleInviteModal");
  });
</script>

<main class="flex flex-col gap-4">
  <SwitchComponent
    labelText="Test Confirm Modal"
    descriptionText="Show match confirmation popup on page for testing"
    switchId={matchModalSwitchId}
    bind:checked={showConfirmModal}
  />
  <SwitchComponent
    labelText="Test Party Invite Toast"
    descriptionText="Show party invite toast on page for testing"
    switchId={inviteModalSwitchId}
    bind:checked={showInviteModal}
  />
  <SwitchComponent
    labelText="Keep Alive"
    descriptionText="Keep the renown page alive to prevent it from sleeping"
    switchId={keepAliveSwitchId}
    bind:checked={keepAlive}
  />
</main>
