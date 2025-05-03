<script lang="ts">
  import * as Alert from "../../lib/components/ui/alert/index.js";
  import * as Select from "../../lib/components/ui/select/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { DropdownSlider } from "$lib/components/ui/dropdown-slider/index.js";
  let {
    matchFoundSound = $bindable("none"),
    matchFoundVolume = $bindable(70),
  } = $props();

  let checked = $state(false);

  const matchFoundSounds = [
    { label: "None", value: "none" },
    { label: "Howl", value: "howl" },
  ];
</script>

<main class=" flex flex-col gap-4">
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
</main>

<style></style>
