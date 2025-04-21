<script lang="ts">
  import type { UserSettings } from "$lib/types";

  let {
    sounds = $bindable<UserSettings["sounds"]>({
      matchFound: {
        volume: 70,
        enabled: true,
        customSound: null,
      },
      partyInvite: {
        volume: 70,
        enabled: true,
        customSound: null,
      },
    }),
  } = $props();
</script>

<main class="flex flex-col gap-6">
  <h2 class="text-xl font-medium text-white mb-2">Sound Settings</h2>

  <div class="text-slate-200 border-2 border-slate-900 rounded-lg p-4">
    <div class="flex flex-col gap-2">
      <p class="text-lg">Match Found Sound</p>
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          id="match-found-enabled"
          bind:checked={sounds.matchFound.enabled}
        />
        <label for="match-found-enabled">Enabled</label>
      </div>

      <div class="mt-2">
        <div class="w-full flex justify-between items-center mb-2">
          <span>Volume</span>
          <span>{sounds.matchFound.volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          class="w-full"
          bind:value={sounds.matchFound.volume}
          disabled={!sounds.matchFound.enabled}
        />
      </div>
    </div>
  </div>

  <div class="text-slate-200 border-2 border-slate-900 rounded-lg p-4">
    <div class="flex flex-col gap-2">
      <p class="text-lg">Party Invite Sound</p>
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          id="party-invite-enabled"
          bind:checked={sounds.partyInvite.enabled}
        />
        <label for="party-invite-enabled">Enabled</label>
      </div>

      <div class="mt-2">
        <div class="w-full flex justify-between items-center mb-2">
          <span>Volume</span>
          <span>{sounds.partyInvite.volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          class="w-full"
          bind:value={sounds.partyInvite.volume}
          disabled={!sounds.partyInvite.enabled}
        />
      </div>
    </div>
  </div>
</main>

<style></style>
