console.log("Clutch extension invite modal module loaded");

export const inviteModalHtml = `
<div
    class="Toastify__toast-container Toastify__toast-container--bottom-right"
  >
<div id="clutch-ext-invite-toast" class="Toastify__toast Toastify__toast-theme--dark Toastify__toast--info" data-in="true">
  <div role="alert" class="Toastify__toast-body">
    <div>
      <div class="toast-party-invite">
        <div class="content">
          <div class="avatars">
            <div class="avatar-row avatar-row">
              <img
                alt="avatar"
                loading="lazy"
                width="40"
                height="40"
                decoding="async"
                data-nimg="1"
                class="avatar"
                src="https://avatars.steamstatic.com/452ef870559bab9e52babfa621834e020cd01204_full.jpg"
                style="color: transparent"
              />
            </div>
          </div>
          <div>
            <div class="invited-to">
              Invite to <span class="name">Team xs3s</span>
            </div>
            <div class="invited-by">
              From <span class="name">xs3s</span>
            </div>
          </div>
        </div>
        <div class="accept-decline">
          <button class="decline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              width="22"
              height="22"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18 6 6 18M6 6l12 12"
              ></path>
            </svg></button
          ><button class="accept">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              width="22"
              height="22"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 6 9 17l-5-5"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="Toastify__progress-bar--wrp" data-hidden="false">
    <div
      class="Toastify__progress-bar--bg Toastify__progress-bar-theme--dark Toastify__progress-bar--info"
    ></div>
    <div
      role="progressbar"
      aria-hidden="false"
      aria-label="notification timer"
      class="Toastify__progress-bar Toastify__progress-bar--animated Toastify__progress-bar-theme--dark Toastify__progress-bar--info invite-progress"
      style="animation-duration: 29992ms; animation-play-state: running"
    ></div>
  </div>
</div>
</div>`;

export function toggleInviteModal(
  show: boolean,
  userSettings: any,
  saveToChromeAndLocal: (settings: any) => Promise<void>
): void {
  const toastifyContainer = document.querySelector(".Toastify");
  if (!toastifyContainer) return;

  const existing = toastifyContainer.querySelector("#clutch-ext-invite-toast");
  if (show && !existing) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = inviteModalHtml;
    const modal = wrapper.firstElementChild!;
    toastifyContainer.appendChild(modal);
    const acceptBtn = modal.querySelector("button.accept");
    const declineBtn = modal.querySelector("button.decline");

    if (acceptBtn) {
      acceptBtn.addEventListener("click", async () => {
        toggleInviteModal(false, userSettings, saveToChromeAndLocal);
        if (userSettings && saveToChromeAndLocal) {
          userSettings.showInviteModal = false;
          await saveToChromeAndLocal(userSettings);
        }
      });
    }
    if (declineBtn) {
      declineBtn.addEventListener("click", async () => {
        toggleInviteModal(false, userSettings, saveToChromeAndLocal);
        if (userSettings && saveToChromeAndLocal) {
          userSettings.showInviteModal = false;
          await saveToChromeAndLocal(userSettings);
        }
      });
    }
  } else if (!show && existing) {
    existing.remove();
  }
}
