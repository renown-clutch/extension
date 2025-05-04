<script lang="ts">
  import { draggable, droppable, type DragDropState } from "@thisux/sveltednd";

  interface Map {
    id: string;
    name: string;
  }

  let container1 = $state<Map[]>([
    { id: "mirage", name: "Mirage" },
    { id: "ancient", name: "Ancient" },
    { id: "nuke", name: "Nuke" },
  ]);

  let container2 = $state<Map[]>([
    { id: "train", name: "Train" },
    { id: "dust2", name: "Dust II" },
    { id: "inferno", name: "Inferno" },
  ]);

  let isDraggingOver = $state<string | null>(null);

  function handleDrop(state: DragDropState<Map>) {
    const { sourceContainer, targetContainer, draggedItem } = state;

    if (sourceContainer === "container1" && targetContainer === "container2") {
      // Move from container1 to container2
      container1 = container1.filter((i) => i.id !== draggedItem.id);
      container2 = [...container2, draggedItem];
    } else if (sourceContainer === "container1") {
      // Reorder within container1
      container1 = container1.filter((i) => i.id !== draggedItem.id);
      container1 = [...container1, draggedItem];
    }
    isDraggingOver = null;
  }

  function moveToContainer1(item: Map) {
    container2 = container2.filter((i) => i.id !== item.id);
    container1 = [...container1, item];
  }

  function moveToContainer2(item: Map) {
    container1 = container1.filter((i) => i.id !== item.id);
    container2 = [...container2, item];
  }

  function handleDragOver(container: string) {
    isDraggingOver = container;
  }

  function handleDragLeave() {
    isDraggingOver = null;
  }
</script>

<div class="flex flex-col gap-4 w-full">
  <div
    class="p-3 border-2 border-slate-900 rounded-lg transition-colors duration-200 w-full"
    class:border-slate-500={isDraggingOver === "container1"}
    use:droppable={{
      container: "container1",
      callbacks: {
        onDrop: handleDrop,
        onDragOver: () => handleDragOver("container1"),
        onDragLeave: handleDragLeave,
      },
    }}
  >
    <h3 class="text-sm font-medium text-slate-300 mb-2">Map Veto</h3>
    <div class="flex flex-col gap-2 w-full">
      {#each container1 as item, index}
        <div
          class="flex items-center justify-between px-2 py-1 border-2 border-slate-900 rounded text-sm text-slate-300 group w-full"
          use:draggable={{ container: "container1", dragData: item }}
        >
          <div class="flex items-center gap-2">
            <span class="text-slate-500 w-4">{index + 1}.</span>
            <span>{item.name}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              on:click={() => moveToContainer2(item)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <div class="w-6 h-6 flex items-center justify-center cursor-move">
              <div class="grid grid-cols-2 grid-rows-3 gap-0.5">
                {#each Array(6) as _}
                  <div class="w-1 h-1 bg-slate-500 rounded-full"></div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div
    class="p-3 border-2 border-slate-900 rounded-lg transition-colors duration-200 w-full"
    class:border-slate-500={isDraggingOver === "container2"}
    use:droppable={{
      container: "container2",
      callbacks: {
        onDrop: handleDrop,
        onDragOver: () => handleDragOver("container2"),
        onDragLeave: handleDragLeave,
      },
    }}
  >
    <h3 class="text-sm font-medium text-slate-300 mb-2">Available Maps</h3>
    <div class="grid grid-cols-2 gap-2 w-full">
      {#each container2 as item}
        <div
          class="flex items-center justify-between px-2 py-1 border-2 border-slate-900 rounded text-sm text-slate-300 w-full"
        >
          <span>{item.name}</span>
          <button
            class="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-300 transition-colors"
            on:click={() => moveToContainer1(item)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  </div>
</div>
