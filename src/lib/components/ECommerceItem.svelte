<script lang="ts">
  export let setActiveItem;
</script>

<div
  role="button"
  tabindex="0"
  class="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-blue-gray-50 hover:bg-opacity-80 hover:text-blue-gray-900 focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
  on:click={() => setActiveItem("Dashboard")}
  on:keydown={(e) => e.key === "Enter" && setActiveItem("Dashboard")}
>
  <div class="grid mr-4 place-items-center">
    <!-- SVG Icon for Dashboard -->
  </div>
  Dashboard
</div>

<style></style>
