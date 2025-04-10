<script>
  import {
    Settings,
    Palette,
    CircleCheckBig,
    Vote,
    Music,
    Volume2,
    Ban,
  } from "@lucide/svelte";

  import themeItem from "./themeItem.svelte";
  import AutoAccept from "./autoAccept.svelte";

  // ...import other components as needed...

  // Set the activeItem to the name of the first item in the sidebarItems array
  let activeItem = "Theme";

  const sidebarItems = [
    { name: "Theme", icon: Palette, component: themeItem },
    {
      name: "Auto-accept",
      icon: CircleCheckBig,
      component: AutoAccept,
    },
    { name: "Map voting", icon: Vote, component: themeItem },
    { name: "Sounds", icon: Volume2, component: themeItem },
    { name: "Bans", icon: Ban, component: themeItem },
    { name: "Settings", icon: Settings, component: themeItem },
  ];

  function setActiveItem(item) {
    activeItem = item;
  }

  // Resolve the active component based on the active item
  let activeComponent;
  $: {
    const active = sidebarItems.find((item) => item.name === activeItem);
    activeComponent = active ? active.component : null;
  }
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
      {#each sidebarItems as { name, icon }}
        <div
          role="button"
          class="flex items-center w-full gap-2 mb-6 leading-tight transition-all rounded-lg outline-none text-start hover:bg-blue-gray-50 hover:bg-opacity-80 hover:text-blue-gray-900 focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
          on:click={() => setActiveItem(name)}
        >
          <div class="grid place-items-center">
            <svelte:component this={icon} class="w-5 h-5" />
          </div>
          {name}
        </div>
      {/each}
    </nav>
  </div>

  <!-- Main Content -->
  <div class="flex-1 p-4">
    {#if activeComponent}
      <svelte:component this={activeComponent} />
    {/if}
  </div>
</div>
