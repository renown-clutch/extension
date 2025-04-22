<script lang="ts">
  import Volume from "../../lib/components/constants/volumeSlider.svelte";
  import * as Alert from "../../lib/components/ui/alert/index.js";
</script>

<main class=" flex flex-col gap-4">
  <Alert.Root class="bg-yellow-600">
    <Alert.Title class="text-lg" >Sorry!</Alert.Title>
    <Alert.Description class="text-xs"
      >This feature is not available yet, but we are working on it!</Alert.Description
    >
  </Alert.Root>
  <Volume
    labelText="Match found"
    descriptionText="Adjust the volume of the match found sound"
    disabled={true}
  />

</main>

<style></style>
