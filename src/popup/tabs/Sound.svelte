<script lang="ts">
  import { DropdownSlider } from "$lib/components/ui/dropdown-slider/index.js";
  import { SoundTestButton } from "$lib/components/ui/sound-test-button";
  import type { MatchFoundSound } from "$lib/types";
  import * as Alert from "$lib/components/ui/alert/index.js";
  let {
    matchFoundSound = $bindable("none") as MatchFoundSound,
    matchFoundVolume = $bindable(70),
  } = $props();

  const matchFoundSounds = [
    { label: "None", value: "none" },
    { label: "Howl", value: "howl" },
    { label: "Rock", value: "rock" },
    { label: "Trumpet", value: "trumpet" },
    { label: "Ah Shit", value: "ah_shit" },
    { label: "Ok Let's Go", value: "ok_letsgo" },
  ];
</script>

<main class="flex flex-col gap-4">
  <Alert.Root class="border bg-yellow-600">
    <Alert.Description class="text-xs"
      >This feature is unstable and should be used with caution.</Alert.Description
    >
  </Alert.Root>
  <DropdownSlider
    labelText="Match found"
    description="Play a custom sound when a match is found"
    sliderLabelText="Volume"
    sliderDescription="Volume of the match found sound"
    options={matchFoundSounds}
    bind:selectedValue={matchFoundSound}
    bind:sliderValue={matchFoundVolume}
    disabled={matchFoundSound === "none"}
  />

  <div class="flex justify-end mt-2">
    <SoundTestButton
      sound={matchFoundSound}
      volume={matchFoundVolume}
      disabled={matchFoundSound === "none" || matchFoundVolume === 0}
    />
  </div>
</main>

<style></style>
