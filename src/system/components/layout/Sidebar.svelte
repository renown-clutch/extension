<script lang="ts">
  import ClutchLogo from "/assets/images/logo.png";
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

  type Icon = typeof Settings;

  type SidebarItem = {
    name: string;
    sectionId: string;
    icon: Icon;
    isBeta?: boolean;
  };

  const sidebarItems: SidebarItem[] = [
    { name: "Theme", sectionId: "theme-section", icon: Palette },
    {
      name: "Auto-accept",
      sectionId: "auto-accept-section",
      icon: CircleCheckBig,
    },
    { name: "Chat", sectionId: "chat-section", icon: MessageCircle },
    { name: "MainPage", sectionId: "mainpage-section", icon: HomeIcon },
    { name: "Match", sectionId: "match-section", icon: Swords },
    // {
    //   name: "Sounds",
    //   sectionId: "sounds-section",
    //   icon: Volume2,
    //   isBeta: true,
    // },
    { name: "Profiles", sectionId: "profiles-section", icon: User },
    { name: "Friends", sectionId: "friends-section", icon: Users },
    { name: "Settings", sectionId: "settings-section", icon: Settings },
  ];

  let { activeSection = $bindable("theme-section") } = $props();

  function scrollToSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
      activeSection = sectionId;
    }
  }

  // Track which section is currently in view
  function handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        activeSection = entry.target.id;
      }
    });
  }

  // Set up intersection observer to track active section
  function setupIntersectionObserver() {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: "-10% 0px -50% 0px", // Reduced bottom margin to catch last section better
      threshold: 0.1,
    });

    sidebarItems.forEach((item) => {
      const section = document.getElementById(item.sectionId);
      if (section) {
        observer.observe(section);
      }
    });

    // Additional scroll listener to handle edge cases like the last section
    const handleScroll = () => {
      const scrollContainer = document.querySelector(".overflow-y-auto");
      if (!scrollContainer) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;

      // If we're near the bottom (within 50px), activate the last section
      if (scrollHeight - scrollTop - clientHeight < 50) {
        activeSection = "settings-section";
      }
    };

    const scrollContainer = document.querySelector(".overflow-y-auto");
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll, {
        passive: true,
      });
    }

    return () => {
      observer.disconnect();
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }

  // Set up observer after component mounts
  $effect(() => {
    const cleanup = setupIntersectionObserver();
    return cleanup;
  });
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
      {#each sidebarItems as { name, sectionId, icon: Icon, isBeta }}
        <li class="list-none">
          <div
            role="button"
            tabindex="0"
            class="flex items-center text-base gap-2 mb-1 p-2 hover:bg-[var(--slate-900)] leading-tight transition-all duration-300 ease-in-out rounded-md
             outline-none text-start cursor-pointer sidebar-item {activeSection ===
            sectionId
              ? 'bg-[var(--slate-900)] active-section'
              : ''}"
            onclick={() => scrollToSection(sectionId)}
            onkeydown={(e) => e.key === "Enter" && scrollToSection(sectionId)}
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

<style>
  .sidebar-item {
    position: relative;
    transform: translateX(0);
    transition: all 0.3s ease-in-out;
  }

  .sidebar-item:hover {
    transform: translateX(2px);
  }

  .active-section {
    transform: translateX(4px);
    box-shadow: inset 3px 0 0 var(--slate-400);
  }

  .active-section:hover {
    transform: translateX(4px);
  }
</style>
