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
  let activeItem = "Dashboard";

  const sidebarItems = [
    { name: "Theme", icon: Palette, content: "Custom Theme" },
    {
      name: "Auto-accept",
      icon: CircleCheckBig,
      content: "Auto-accept",
    },
    { name: "Map voting", icon: Vote, content: "Map Voting" },
    { name: "Sounds", icon: Volume2, content: "Sounds" },
    { name: "Bans", icon: Ban, content: "Bans" },
    { name: "Settings", icon: Settings, content: "Settings" },
  ];

  function setActiveItem(item) {
    activeItem = item;
  }
</script>

<div class="flex">
  <!-- Sidebar -->
  <div
    class="container relative flex h-full w-52 flex-col border-r-2 border-slate-900 text-white shadow-xl shadow-blue-gray-900/5"
  >
    <div class="mb-8"></div>
    <nav
      class="flex min-w-[240px] flex-col font-sans text-base font-normal text-blue-gray-700"
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
    {#each sidebarItems as { name, content }}
      {#if activeItem === name}
        <div>{content}</div>
      {/if}
    {/each}
  </div>
</div>
