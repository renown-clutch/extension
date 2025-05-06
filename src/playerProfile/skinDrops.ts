import { is404Page } from "../utils/pageUtils";
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
      return "rgb(235, 75, 75)";
    case "Classified":
      return "rgb(211, 44, 230)";
    case "Restricted":
      return "rgb(136, 71, 255)";
    case "Mil-Spec Grade":
      return "rgb(75, 105, 255)";
    case "Industrial Grade":
      return "rgb(94, 152, 217)";
    case "Consumer Grade":
      return "rgb(176, 195, 217)";
    default:
      return "rgb(235, 75, 75)";
  }
}

function createDroppedSkinElement(drop: Drop): HTMLDivElement {
  const droppedSkin = document.createElement("div");
  droppedSkin.className = "dropped-skin";
  droppedSkin.setAttribute("data-clutch-extension", "true");

  const weaponName = drop.skin_name.split(" | ")[0];
  const skinName = drop.skin_name.split(" | ")[1];

  const topDiv = document.createElement("div");
  topDiv.className = "top";

  const matchLink = document.createElement("a");
  matchLink.href = `/match/${drop.match_id}`;

  const matchLinkDiv = document.createElement("div");
  matchLinkDiv.className = "match-link";

  const matchSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  matchSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  matchSvg.setAttribute("fill", "none");
  matchSvg.setAttribute("viewBox", "0 0 24 24");
  matchSvg.setAttribute("width", "16");
  matchSvg.setAttribute("height", "16");

  const matchPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  matchPath.setAttribute("stroke", "currentColor");
  matchPath.setAttribute("stroke-linecap", "round");
  matchPath.setAttribute("stroke-linejoin", "round");
  matchPath.setAttribute("stroke-width", "2");
  matchPath.setAttribute(
    "d",
    "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6m0 0v6m0-6L10 14"
  );

  matchSvg.appendChild(matchPath);
  matchLinkDiv.appendChild(matchSvg);

  matchLinkDiv.appendChild(document.createTextNode(`#${drop.match_id}`));
  matchLink.appendChild(matchLinkDiv);
  topDiv.appendChild(matchLink);

  const priceDiv = document.createElement("div");
  priceDiv.className = "price";

  const priceSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  priceSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  priceSvg.setAttribute("fill", "none");
  priceSvg.setAttribute("viewBox", "0 0 24 24");
  priceSvg.setAttribute("width", "16");
  priceSvg.setAttribute("height", "16");

  const pricePath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  pricePath.setAttribute("stroke", "currentColor");
  pricePath.setAttribute("stroke-linecap", "round");
  pricePath.setAttribute("stroke-linejoin", "round");
  pricePath.setAttribute("stroke-width", "2");
  pricePath.setAttribute(
    "d",
    "M7.5 7.5h.01m13.58 6.41-7.17 7.17a2 2 0 0 1-2.83 0L2.5 12.5v-10h10l8.59 8.59a2 2 0 0 1 0 2.82"
  );

  priceSvg.appendChild(pricePath);
  priceDiv.appendChild(priceSvg);

  const priceText = drop.buff_price
    ? `€${(drop.buff_price / 100).toFixed(2)}`
    : "?";

  priceDiv.appendChild(document.createTextNode(priceText));
  topDiv.appendChild(priceDiv);

  droppedSkin.appendChild(topDiv);

  const imageWrapper = document.createElement("div");
  imageWrapper.className = "skin-image-wrapper";

  const img = document.createElement("img");
  img.alt = "Skin";
  img.loading = "lazy";
  img.width = 99;
  img.height = 74;
  img.decoding = "async";
  img.setAttribute("data-nimg", "1");

  const iconUrl = `https://community.akamai.steamstatic.com/economy/image/${drop.icon_hash}`;
  img.srcset =
    `/_next/image?url=${encodeURIComponent(iconUrl)}&w=128&q=75 1x, ` +
    `/_next/image?url=${encodeURIComponent(iconUrl)}&w=256&q=75 2x`;
  img.src = `/_next/image?url=${encodeURIComponent(iconUrl)}&w=256&q=75`;
  img.style.color = "transparent";

  imageWrapper.appendChild(img);
  droppedSkin.appendChild(imageWrapper);

  const detailsDiv = document.createElement("div");
  detailsDiv.className = "skin-details";

  const weaponDiv = document.createElement("div");
  weaponDiv.className = "weapon";
  weaponDiv.style.color = getRarityColor(drop.rarity_name);
  weaponDiv.textContent = weaponName;
  detailsDiv.appendChild(weaponDiv);

  const skinNameDiv = document.createElement("div");
  skinNameDiv.className = "skin-name";
  skinNameDiv.textContent = skinName;
  detailsDiv.appendChild(skinNameDiv);

  const exteriorDiv = document.createElement("div");
  exteriorDiv.className = "exterior";
  exteriorDiv.textContent = `${drop.exterior} (${drop.float_value.toFixed(3)})`;
  detailsDiv.appendChild(exteriorDiv);

  droppedSkin.appendChild(detailsDiv);

  return droppedSkin;
}

function createSkinsContainer(drops: Drop[]): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "container drops-container clutch-skin-drops-container";
  container.setAttribute("data-clutch-extension", "true");

  const title = document.createElement("div");
  title.className = "title";

  // Calculate total price if there's more than 1 skin
  if (drops.length > 1) {
    const totalPrice = drops.reduce(
      (sum, drop) => sum + (drop.buff_price || 0),
      0
    );
    const formattedPrice = (totalPrice / 100).toFixed(2);
    title.textContent = `Skin Drops (€${formattedPrice})`;
  } else {
    title.textContent = "Skin Drops";
  }

  container.appendChild(title);

  const scroll = document.createElement("div");
  scroll.className = "scroll";

  const content = document.createElement("div");
  content.className = "content";
  content.style.marginBottom = "0px";

  drops.forEach((drop) => {
    content.appendChild(createDroppedSkinElement(drop));
  });

  scroll.appendChild(content);
  container.appendChild(scroll);

  return container;
}

function removeExistingDropsContainer() {
  document
    .querySelectorAll(".clutch-skin-drops-container")
    .forEach((element) => {
      if (element.parentElement?.classList.contains("drops-container")) {
        element.parentElement?.remove();
      }
    });
}

async function waitForProfileContainer(): Promise<Element> {
  return waitForElement(".page.profile > .container");
}

async function renderDropsUI(drops: Drop[]): Promise<void> {
  const existingDropsContainer = document.querySelector(
    ".clutch-skin-drops-container"
  );
  if (existingDropsContainer) {
    return;
  }

  if (!drops || drops.length === 0) return;

  removeExistingDropsContainer();

  const containerElem = await waitForProfileContainer();
  const dropsContainer = createSkinsContainer(drops);

  containerElem.parentElement?.insertBefore(dropsContainer, containerElem);
}

export async function initializeSkinDrops(showDrops: boolean): Promise<void> {
  if (!isProfilePage()) {
    return;
  }
  if (!showDrops) {
    removeExistingDropsContainer();
    return;
  }

  if (is404Page()) {
    return;
  }

  const playerId = getPlayerIdFromUrl();
  if (!playerId) return;

  const drops = await fetchUserDrops(playerId);

  await renderDropsUI(drops);
}
