console.log("Clutch extension confirm modal module loaded");

let confirmModalActive = false;
export const confirmModalHtml = `<div class="confirm-match-modal"><div class="modal-content"><div class="waiting-for-confirm"><h3 class="title">Your match is ready</h3><div class="confirm-within">Confirm your participation within</div><div class="countdown"><span class="countdown-render">00:08</span></div><button class="primary-button md gradient">Accept</button></div><div class="disclaimer">When you start a game of Renown, you're agreeing to stay for the entire match, usually lasting 30-45 minutes. Leaving the match once you've joined will result in a penalty.</div></div></div>`;

export function toggleConfirmModal(
  show: boolean,
  userSettings: any,
  saveToChromeAndLocal: (settings: any) => Promise<void>
): void {
  const main = document.querySelector("main");
  if (!main) return;

  const existing = main.querySelector(".confirm-match-modal");
  if (show && !existing) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = confirmModalHtml;
    const modal = wrapper.firstElementChild!;
    main.prepend(modal);
    const acceptBtn = modal.querySelector("button.primary-button");
    if (acceptBtn) {
      acceptBtn.addEventListener("click", async () => {
        toggleConfirmModal(false, userSettings, saveToChromeAndLocal);
        userSettings.showConfirmModal = false;
        await saveToChromeAndLocal(userSettings);
      });
    }
  } else if (!show && existing) {
    existing.remove();
  }
  confirmModalActive = show;
}

export { confirmModalActive };
