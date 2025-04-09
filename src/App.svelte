<script lang="ts">
  import "./app.css";
  import { Button } from "$lib/components/ui/button";
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label/index.js";
  import Header from "$lib/components/header.svelte";
</script>

<main class="w-[600px] bg-slate-950">
  <Header />
  Hello world
  <Button>Click me</Button>

  <Switch id="test" />
  <Label for="test">Test switch</Label>
</main>

<style>
</style>
