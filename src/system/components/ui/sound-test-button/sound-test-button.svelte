<script lang="ts">
  import { onDestroy } from "svelte";
  import type { MatchFoundSound } from "$system/lib/types";
  import { soundFileMap } from "$system/lib/types";

  let audioElement: HTMLAudioElement | null = null;

  let {
    sound = "none" as MatchFoundSound,
    volume = 70,
    disabled = false,
    isPlaying = false,
  } = $props();

  function toggleSound() {
    if (isPlaying) {
      stopSound();
    } else {
      playSound();
    }
  }

  function playSound() {
    if (audioElement && isPlaying) {
      stopSound();
    }

    audioElement = new Audio(
      chrome.runtime.getURL(`static/sounds/${soundFileMap[sound]}`)
    );

    if (audioElement) {
      audioElement.volume = volume / 100;
      audioElement
        .play()
        .then(() => {
          isPlaying = true;
          audioElement!.onended = () => {
            isPlaying = false;
          };
        })
        .catch((err) => console.error("Error playing test sound:", err));
    }
  }

  function stopSound() {
    if (audioElement && isPlaying) {
      audioElement.pause();
      audioElement.currentTime = 0;
      isPlaying = false;
    }
  }

  // Clean up when component is destroyed
  onDestroy(() => {
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
  });
</script>

<button
  class="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium transition-colors border bg-[var(--slate-900)] hover:bg-[var(--slate-800)] hover:text-[var(--slate-200)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--slate-700)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
  {disabled}
  onclick={toggleSound}
>
  {isPlaying ? "Stop" : "Test Sound"}
</button>
