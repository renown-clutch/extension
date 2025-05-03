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
    { name: "Friends", icon: Users },
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
            class="flex items-center text-base gap-2 mb-1 p-2 hover:bg-slate-900 leading-tight transition-all rounded-md
             outline-none text-start {activeTab === name
              ? 'bg-slate-900 '
              : ''}"
            onclick={() => (activeTab = name)}
            onkeydown={(e) => e.key === "Enter" && (activeTab = name)}
          >
            <div class="">
              <Icon class="w-4 h-4" />
            </div>
            {name}
          </div>
        </li>
      {/each}
    </ul>
    <footer class=" mt-auto px-2 flex justify-between items-center">
      <div class="">
        <a
          href="https://discord.gg/qqBXYjEfmW"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 text-slate-300 hover:text-slate-100 transition-colors group"
        >
          <figure>
            <svg
              id="Discord-Logo"
              class="w-4 fill-slate-300 group-hover:fill-slate-100 transition-colors"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 126.644 96"
              ><defs></defs><path
                id="Discord-Symbol-White"
                class="cls-1"
                d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"
              /></svg
            >
          </figure>
          <span class="text-xs">Join our Discord</span>
        </a>
      </div>
    </footer>
  </div>
</div>
