<script lang="ts">
  import {
    Settings,
    Palette,
    CircleCheckBig,
    Vote,
    Volume2,
    Ban,
  } from "@lucide/svelte";

  import ThemeItem from "./ThemeItem.svelte";
  import AutoAcceptItem from "./AutoAcceptItem.svelte";

  type SidebarItem = {
    name: string;
    icon: any;
    component: any;
  };

  const sidebarItems: SidebarItem[] = [
    { name: "Theme", icon: Palette, component: ThemeItem },
    {
      name: "Auto-accept",
      icon: CircleCheckBig,
      component: AutoAcceptItem,
    },
    { name: "Map voting", icon: Vote, component: ThemeItem },
    { name: "Sounds", icon: Volume2, component: ThemeItem },
    { name: "Bans", icon: Ban, component: ThemeItem },
    { name: "Settings", icon: Settings, component: ThemeItem },
  ];

  let activeItem = $state("Theme");
  let activeComponent = $derived(
    sidebarItems.find((item) => item.name === activeItem)?.component
  );

  function setActiveItem(item: string) {
    activeItem = item;
  }

  $effect(() => {
    console.log(activeComponent);
  });
</script>

<div class="flex">
  <!-- Sidebar -->
  <div
    class="container relative flex h-full w-52 flex-col border-r-2 border-slate-900 text-white"
  >
    <div class="mb-8"></div>
    <nav
      class="flex flex-col font-sans text-base font-normal text-blue-gray-700"
    >
      {#each sidebarItems as { name, icon: Icon }}
        <div
          role="button"
          tabindex="0"
          class="flex items-center w-full gap-2 mb-6 leading-tight transition-all rounded-lg outline-none text-start hover:bg-blue-gray-50 hover:bg-opacity-80 hover:text-blue-gray-900 focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
          onclick={() => setActiveItem(name)}
          onkeydown={(e) => e.key === "Enter" && setActiveItem(name)}
        >
          <div class="grid place-items-center">
            <Icon class="w-5 h-5" />
          </div>
          {name}
        </div>
      {/each}
    </nav>
  </div>

  <!-- Main Content -->
  <div class="flex-1 p-4">
    {#if activeItem === "Theme"}
      <ThemeItem></ThemeItem>
    {:else if activeItem === "Auto-accept"}
      <AutoAcceptItem></AutoAcceptItem>
    {:else if activeItem === "Map voting"}
      <ThemeItem></ThemeItem>
    {:else if activeItem === "Sounds"}
      <ThemeItem></ThemeItem>
    {:else if activeItem === "Bans"}
      <ThemeItem></ThemeItem>
    {:else if activeItem === "Settings"}
      <ThemeItem></ThemeItem>
    {/if}
  </div>
</div>
