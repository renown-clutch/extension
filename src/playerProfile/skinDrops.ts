import {
  isProfilePage,
  getPlayerIdFromUrl,
  waitForElement,
} from "../utils/profileUtils";

interface Drop {
  skin_name: string;
  asset_id: string;
  icon_hash: string;
  exterior: string;
  doppler_phase: string | null;
  buff_price: number;
  name_color: string;
  float_value: number;
  rarity_name: string;
  steam_market_price: number;
  match_id: number;
}

async function fetchUserDrops(steamId: string): Promise<Drop[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "fetchUserDrops", steamId },
      (response) => {
        if (
          response &&
          response.success &&
          response.data &&
          response.data.drops
        ) {
          resolve(response.data.drops);
        } else {
          resolve([]);
        }
      }
    );
  });
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "Covert":
      return "rgb(235, 75, 75)"; // Red
    case "Classified":
      return "rgb(211, 44, 230)"; // Pink
    case "Restricted":
      return "rgb(136, 71, 255)"; // Purple
    case "Mil-Spec Grade":
      return "rgb(75, 105, 255)"; // Blue
    case "Industrial Grade":
      return "rgb(94, 152, 217)"; // Light blue
    case "Consumer":
      return "rgb(176, 195, 217)"; // Light gray
    default:
      return "rgb(235, 75, 75)"; // Default to red
  }
}

function createDroppedSkinElement(drop: Drop): HTMLDivElement {
  const droppedSkin = document.createElement("div");
  droppedSkin.className = "dropped-skin";
  droppedSkin.setAttribute("data-clutch-extension", "true");

  const weaponName = drop.skin_name.split(" | ")[0];
  const skinName = drop.skin_name.split(" | ")[1];

  droppedSkin.innerHTML = `
    <div class="top">
      <a href="/match/${drop.match_id}">
        <div class="match-link">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="16" height="16">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6m0 0v6m0-6L10 14"></path>
          </svg>#${drop.match_id}
        </div>
      </a>
      <div class="price">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="16" height="16">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M7.5 7.5h.01m13.58 6.41-7.17 7.17a2 2 0 0 1-2.83 0L2.5 12.5v-10h10l8.59 8.59a2 2 0 0 1 0 2.82"></path>
        </svg>€${drop.buff_price ? Math.round(drop.buff_price / 100) : "?"}
      </div>
    </div>
    <div class="skin-details">
      <div class="weapon" style="color: ${getRarityColor(
        drop.rarity_name
      )}">${weaponName}</div>
      <div class="skin-name">${skinName}</div>
      <div class="exterior">${drop.exterior} (${drop.float_value.toFixed(
    3
  )})</div>
    </div>
  `;

  return droppedSkin;
}

function createSkinsContainer(drops: Drop[]): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "container drops-container";
  container.setAttribute("data-clutch-extension", "true");

  const scroll = document.createElement("div");
  scroll.className = "scroll";

  const content = document.createElement("div");
  content.className = "content";

  drops.forEach((drop) => {
    content.appendChild(createDroppedSkinElement(drop));
  });

  scroll.appendChild(content);
  container.appendChild(scroll);

  return container;
}

function removeExistingDropsContainer() {
  document
    .querySelectorAll("[data-clutch-extension='true']")
    .forEach((element) => {
      if (
        element.classList.contains("drops-container") ||
        element.parentElement?.classList.contains("drops-container")
      ) {
        element.remove();
      }
    });
}

async function waitForProfileContainer(): Promise<Element> {
  return waitForElement(".page.profile > .container");
}

async function renderDropsUI(drops: Drop[]): Promise<void> {
  if (!drops || drops.length === 0) return;

  removeExistingDropsContainer();

  const containerElem = await waitForProfileContainer();
  const dropsContainer = createSkinsContainer(drops);

  containerElem.parentElement?.insertBefore(dropsContainer, containerElem);
}

export async function initialize(showDrops: boolean): Promise<void> {
  if (!showDrops || !isProfilePage()) {
    removeExistingDropsContainer();
    return;
  }

  const playerId = getPlayerIdFromUrl();
  if (!playerId) return;

  const drops = await fetchUserDrops(playerId);

  await renderDropsUI(drops);
}
