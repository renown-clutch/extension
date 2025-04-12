<script lang="ts">
  import ClutchLogo from "/static/logo.png";
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
    <img src={ClutchLogo} alt="Clutch Logo" class="w-28 py-8" />
    <ul
      class="flex flex-col font-sans text-base font-normal text-blue-gray-700"
    >
      {#each sidebarItems as { name, icon: Icon }}
        <li class="list-none">
          <div
            role="button"
            tabindex="0"
            class="flex items-center gap-2 mb-2 p-2 hover:bg-slate-50 leading-tight transition-all rounded-md
             outline-none text-start hover:text-slate-950

               
                active:text-blue-gray-900
                {activeTab === name ? 'bg-slate-50 text-slate-950' : ''}"
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
