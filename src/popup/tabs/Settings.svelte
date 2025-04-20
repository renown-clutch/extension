<script lang="ts">
  import SwitchComponent from "$lib/components/constants/switch.svelte";

  let { keepAlive = $bindable(false) } = $props();

  let keepAliveSwitchId = "keep-alive-switch";
</script>

<main class="flex flex-col gap-4">
  <SwitchComponent
    labelText="Keep Alive"
    descriptionText="Keep the renown page alive to prevent it from sleeping"
    switchId={keepAliveSwitchId}
    bind:checked={keepAlive}
  />
</main>
