<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";

  const themes = [
    { label: "Default", value: "" },
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
  ];

  let selectedTheme = $state("");
  let initialTheme = $state("");
  let isInitialLoad = $state(true);

  $effect(() => {
    chrome.storage.local.get("theme", (result) => {
      selectedTheme = result.theme || "";
      initialTheme = selectedTheme;
      isInitialLoad = false;
    });
  });

  const triggerContent = $derived(
    themes.find((t) => t.value === selectedTheme)?.label ?? "Select a theme"
  );

  $effect(() => {
    // Skip saving and reloading during initial load
    if (isInitialLoad) return;

    // Only save and reload if the theme has actually changed
    if (selectedTheme !== initialTheme) {
      chrome.storage.local.set({ theme: selectedTheme }, () => {
        initialTheme = selectedTheme; // Update initialTheme to prevent multiple reloads

        // Reload the current page after theme is saved
        if (chrome.tabs && chrome.tabs.reload) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
              chrome.tabs.reload(tabs[0].id);
            }
          });
        } else {
          // Fallback to window reload if chrome.tabs API is not available
          window.location.reload();
        }
      });
    }
  });
</script>

<main class=" py-2">
  <h2 class="text-xl font-medium mb-4">Custom Theme</h2>
  <p class="leading-none mb-4">
    Enable the clutch custom theme for a fresh renown.gg experience.
  </p>

  <div class="flex items-center gap-8">
    <Label for="theme-select">Theme</Label>
    <div id="theme-select">
      <Select.Root type="single" name="" bind:value={selectedTheme}>
        <Select.Trigger class="w-[180px]">
          {triggerContent}
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            {#each themes as theme (theme.value)}
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
