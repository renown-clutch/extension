<script lang="ts">
  import Volume from "../../lib/components/constants/volumeSlider.svelte";
  import * as Alert from "../../lib/components/ui/alert/index.js";
</script>

<main class=" flex flex-col gap-4">
  <Volume
    labelText="Match found"
    descriptionText="Adjust the volume of the match found sound"
    disabled={true}
  />

  <Alert.Root>
    <Alert.Title>Sorry!</Alert.Title>
    <Alert.Description
      >This feature is not available yet, but we are working on it!</Alert.Description
    >
  </Alert.Root>
</main>

<style></style>
