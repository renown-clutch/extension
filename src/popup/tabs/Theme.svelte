<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import browserAPI from "$lib/browserAPI";

  const themes = [
    { label: "Default", value: "default" },
    { label: "Dark", value: "dark" },
    { label: "Dark Gray", value: "darkgray" },
    { label: "Pink", value: "pink" },
    { label: "Purple", value: "purple" },
    { label: "Green", value: "green" },
  ];

  let { selectedTheme = $bindable("") } = $props();
  let previousTheme = $state(selectedTheme);

  const triggerContent = $derived(
    themes.find((t) => t.value === selectedTheme)?.label ?? "Select a theme"
  );

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

  $effect(() => {
    if (
      selectedTheme === "default" &&
      previousTheme !== "" &&
      previousTheme !== selectedTheme
    ) {
      console.log("Reloading page");
      reloadPage();
    }
    previousTheme = selectedTheme;
  });
</script>

<main class=" ">
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
