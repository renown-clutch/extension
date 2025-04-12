<script lang="ts">
  import {
    Settings,
    Palette,
    CircleCheckBig,
    Vote,
    Volume2,
    Ban,
  } from "@lucide/svelte";

  type Icon = typeof Settings;

  type SidebarItem = {
    name: string;
    icon: Icon;
  };

  const sidebarItems: SidebarItem[] = [
    { name: "Theme", icon: Palette },
    { name: "Auto-accept", icon: CircleCheckBig },
    { name: "Map voting", icon: Vote },
    { name: "Sounds", icon: Volume2 },
    { name: "Bans", icon: Ban },
    { name: "Settings", icon: Settings },
  ];

  let { activeTab = $bindable("") } = $props();
</script>

<div class="flex">
  <div
    class="container relative flex h-full w-52 flex-col border-r-2 border-slate-900 text-slate-500"
  >
    <div class="mb-8"></div>
    <ul
      class="flex flex-col font-sans text-base font-normal text-blue-gray-700"
    >
      {#each sidebarItems as { name, icon: Icon }}
        <li class="list-none">
          <div
            role="button"
            tabindex="0"
            class="flex items-center gap-2 mb-6 leading-tight transition-all rounded-lg
             outline-none text-start hover:bg-blue-gray-50 hover:bg-opacity-80
              hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80
               focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80
                active:text-blue-gray-900
                {activeTab === name ? 'text-white' : ''}"
            onclick={() => (activeTab = name)}
            onkeydown={(e) => e.key === "Enter" && (activeTab = name)}
          >
            <div class="">
              <Icon class="w-5 h-5" />
            </div>
            {name}
          </div>
        </li>
      {/each}
    </ul>
  </div>
</div>
