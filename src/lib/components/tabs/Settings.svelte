<script module>
  // Add a global click handler to toggle the modal when clicking on the SwitchComponent
  if (typeof document !== "undefined") {
    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (
        target &&
        (target.closest("#test-confirm-modal-switch") ||
          target.closest(".switch-component-wrapper"))
      ) {
        document.getElementById("toggle-modal-button")?.click();
      }
    });
  }
</script>

<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";
  import { onMount } from "svelte";

  let showModal = $state(false);
  let switchId = "test-confirm-modal-switch";

  // The HTML to inject
  const confirmModalHtml = `<div class=\"confirm-match-modal\"><div class=\"modal-content\"><div class=\"waiting-for-confirm\"><h3 class=\"title\">Your match is ready<\/h3><div class=\"confirm-within\">Confirm your participation within<\/div><div class=\"countdown\"><span class=\"countdown-render\">00:08<\/span><\/div><button class=\"primary-button md gradient\">Accept<\/button><\/div><div class=\"disclaimer\">When you start a game of Renown, you're agreeing to stay for the entire match, usually lasting 30-45 minutes. Leaving the match once you've joined will result in a penalty.<\/div><\/div><\/div>`;

  async function toggleModal() {
    console.log("[SettingsTab] Toggling modal. Current state:", showModal);
    showModal = !showModal;
    console.log("[SettingsTab] New state:", showModal);

    // Send message to content script to toggle the modal on the actual page
    await sendMessageToContent();
  }

  async function sendMessageToContent() {
    try {
      // Get current active tab to target our message
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs.length === 0) {
        console.error("[SettingsTab] No active tab found");
        return;
      }

      const response = await chrome.tabs.sendMessage(tabs[0].id!, {
        type: "toggleConfirmModal",
        show: showModal,
      });

      console.log("[SettingsTab] Response from content script:", response);
    } catch (error) {
      console.error(
        "[SettingsTab] Error sending message to content script:",
        error
      );
    }
  }

  function updateModal() {
    console.log("[SettingsTab] updateModal called. showModal:", showModal);
    // IMPORTANT: Look for main element in the document body - not in the component
    const main = document.body.querySelector("main:not(.flex.flex-col)");
    console.log("[SettingsTab] Found main element:", main);

    if (!main) {
      console.log("[SettingsTab] No suitable <main> element found on page.");
      return;
    }

    const existing = main.querySelector(".confirm-match-modal");
    if (showModal) {
      if (!existing) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = confirmModalHtml;
        main.prepend(wrapper.firstElementChild!);
        console.log("[SettingsTab] Confirm modal prepended to <main>.");
      } else {
        console.log("[SettingsTab] Confirm modal already exists in <main>.");
      }
    } else {
      if (existing) {
        existing.remove();
        console.log("[SettingsTab] Confirm modal removed from <main>.");
      } else {
        console.log("[SettingsTab] No confirm modal to remove from <main>.");
      }
    }
  }

  // Watch for state changes and update content script
  $effect(() => {
    console.log(
      "[SettingsTab] Effect detected state change, showModal:",
      showModal
    );
    sendMessageToContent();
  });

  onMount(() => {
    console.log("[SettingsTab] Component mounted, initial state:", showModal);
  });
</script>

<main class="flex flex-col gap-4">
  <SwitchComponent
    labelText="Test Confirm Modal"
    descriptionText="Show match confirmation popup on page for testing"
    {switchId}
  />

  <button
    class="hidden"
    type="button"
    onclick={toggleModal}
    id="toggle-modal-button"
  >
    Toggle Modal
  </button>
</main>
