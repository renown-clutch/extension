<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { onMount } from "svelte";
  import { getAllThemes } from "../../../themes";

  // Get themes from our theme system
  const themeOptions = [
    { label: "Disabled", value: "disabled" },
    ...getAllThemes().map((theme) => ({
      label: theme.name,
      value: theme.id,
    })),
  ];

  let selectedTheme = $state("disabled");
  let loading = $state(false);

  // Load the current theme on mount
  $effect(() => {
    loading = true;
    // Try to get current theme from content script first
    sendMessageToContentScript({ type: "getThemeInfo" })
      .then((response) => {
        if (response && response.enabled) {
          selectedTheme = response.currentTheme;
        } else {
          selectedTheme = "disabled";
        }
      })
      .catch(() => {
        // Fall back to local storage if content script not available
        chrome.storage.local.get("clutch_theme", (result) => {
          selectedTheme = result.clutch_theme || "disabled";
        });
      })
      .finally(() => {
        loading = false;
      });
  });

  const triggerContent = $derived(
    themeOptions.find((t) => t.value === selectedTheme)?.label ??
      "Select a theme"
  );

  // Apply theme changes when selection changes
  $effect(() => {
    if (loading) return;

    // Save to local storage
    chrome.storage.local.set({ clutch_theme: selectedTheme });

    // Send message to content script
    if (selectedTheme === "disabled") {
      sendMessageToContentScript({
        type: "toggleTheme",
        enabled: false,
      });
    } else {
      // First enable if needed, then set theme
      sendMessageToContentScript({
        type: "toggleTheme",
        enabled: true,
      }).then(() => {
        sendMessageToContentScript({
          type: "updateTheme",
          themeId: selectedTheme,
        });
      });
    }
  });

  // Helper function to communicate with content script
  async function sendMessageToContentScript(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
</script>

<main class="py-2">
  <h2 class="text-xl font-medium mb-4">Custom Theme</h2>
  <p class="leading-none mb-4">
    Enable the clutch custom theme for a fresh renown.gg experience.
  </p>

  <div class="flex items-center gap-8">
    <Label for="theme-select">Theme</Label>
    <div id="theme-select">
      <Select.Root type="single" name="" bind:value={selectedTheme}>
        <Select.Trigger class="w-[180px]">
          {loading ? "Loading..." : triggerContent}
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            {#each themeOptions as theme (theme.value)}
              <Select.Item value={theme.value} label={theme.label}>
                {theme.label}
              </Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </div>
  </div>
</main>

<style></style>
