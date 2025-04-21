<script lang="ts">
  import ClutchLogo from "/static/logo.png";
  import {
    Settings,
    Palette,
    CircleCheckBig,
    Volume2,
    User,
    Swords,
  } from "@lucide/svelte";

  type Icon = typeof Settings;

  type SidebarItem = {
    name: string;
    icon: Icon;
  };

  const sidebarItems: SidebarItem[] = [
    { name: "Theme", icon: Palette },
    { name: "Auto-accept", icon: CircleCheckBig },
    { name: "Match", icon: Swords },
    { name: "Sounds", icon: Volume2 },
    { name: "Profiles", icon: User },
    { name: "Settings", icon: Settings },
  ];

  let { activeTab = $bindable("") } = $props();
</script>

<div class="flex">
  <div
    class="container py-8 relative flex h-full w-56 flex-col border-r-2 border-slate-900 text-slate-200"
  >
    <img
      src={ClutchLogo}
      alt="Clutch Logo"
      class="w-28 pb-8 select-none"
      draggable="false"
    />
    <ul class="flex flex-col font-sans text-base font-normal">
      {#each sidebarItems as { name, icon: Icon }}
        <li class="list-none">
          <div
            role="button"
            tabindex="0"
            class="flex items-center gap-2 mb-2 p-3 hover:bg-slate-900 leading-tight transition-all rounded-md
             outline-none text-start {activeTab === name
              ? 'bg-slate-900 '
              : ''}"
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
