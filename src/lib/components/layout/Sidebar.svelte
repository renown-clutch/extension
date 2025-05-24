<script lang="ts">
  import ClutchLogo from "/static/logo.png";
  import {
    Settings,
    Palette,
    CircleCheckBig,
    Volume2,
    User,
    Swords,
    Users,
    HomeIcon,
    MessageCircle,
  } from "@lucide/svelte";
  import type { TabName } from "$lib/types";

  type Icon = typeof Settings;

  type SidebarItem = {
    name: TabName;
    icon: Icon;
    isBeta?: boolean;
  };

  const sidebarItems: SidebarItem[] = [
    { name: "Theme", icon: Palette },
    { name: "Auto-accept", icon: CircleCheckBig },
    { name: "Chat", icon: MessageCircle },
    { name: "MainPage", icon: HomeIcon },
    { name: "Match", icon: Swords },
    { name: "Sounds", icon: Volume2, isBeta: true },
    { name: "Profiles", icon: User },
    { name: "Friends", icon: Users },
    { name: "Settings", icon: Settings },
  ];

  let { activeTab = $bindable("") } = $props();
</script>

<div class="flex">
  <div
    class="container py-8 relative flex h-full w-56 flex-col border-r-2 border-[var(--slate-900)] text-[var(--slate-200)]"
  >
    <img
      src={ClutchLogo}
      alt="Clutch Logo"
      class="w-28 pb-8 select-none"
      draggable="false"
    />
    <ul class="flex flex-col font-sans text-base font-normal">
      {#each sidebarItems as { name, icon: Icon, isBeta }}
        <li class="list-none">
          <div
            role="button"
            tabindex="0"
            class="flex items-center text-base gap-2 mb-1 p-2 hover:bg-[var(--slate-900)] leading-tight transition-all rounded-md
             outline-none text-start {activeTab === name
              ? 'bg-[var(--slate-900)] '
              : ''}"
            onclick={() => (activeTab = name)}
            onkeydown={(e) => e.key === "Enter" && (activeTab = name)}
          >
            <div class="">
              <Icon class="w-4 h-4" />
            </div>
            <div class="flex items-center gap-2">
              {name}
              {#if isBeta}
                <span
                  class="text-xs px-1.5 py-0.5 bg-[var(--slate-800)] rounded"
                  >BETA</span
                >
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  </div>
</div>
