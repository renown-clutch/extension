import browserAPI from "../lib/browserAPI";

export function getFaceitLevel(elo: number | null): number {
  if (elo === null) return 0;

  if (elo <= 500) return 1;
  if (elo <= 750) return 2;
  if (elo <= 900) return 3;
  if (elo <= 1050) return 4;
  if (elo <= 1200) return 5;
  if (elo <= 1350) return 6;
  if (elo <= 1530) return 7;
  if (elo <= 1750) return 8;
  if (elo <= 2000) return 9;
  return 10;
}

export function getFaceitLevelIcon(elo: number | null): string {
  const level = getFaceitLevel(elo);

  if (level === 0) return "static/faceitlevels/lvlx.svg";
  return `static/faceitlevels/lvl${level}.svg`;
}

function createFaceitImageElement(
  faceitLevel: number,
  size: number
): HTMLElement {
  const imgContainer = document.createElement("div");
  imgContainer.className = "clutch-faceit-image-container";
  imgContainer.style.width = `${size}px`;
  imgContainer.style.height = `${size}px`;

  let iconPath = "";
  if (faceitLevel === 0) {
    iconPath = chrome.runtime.getURL("static/faceitlevels/lvlx.svg");
  } else {
    iconPath = chrome.runtime.getURL(
      `static/faceitlevels/lvl${faceitLevel}.svg`
    );
  }

  const img = document.createElement("img");
  img.className = "clutch-faceit-image";
  img.alt = `Faceit level ${faceitLevel}`;
  img.width = size;
  img.height = size;
  img.src = iconPath;

  imgContainer.appendChild(img);
  return imgContainer;
}

export function createTooltipElement(text: string): HTMLElement {
  const tooltip = document.createElement("div");
  tooltip.className = "clutch-tooltip";
  tooltip.textContent = text;
  return tooltip;
}

export function addTooltip(element: HTMLElement, text: string): void {
  if (window.getComputedStyle(element).position === "static") {
    element.style.position = "relative";
  }

  const tooltip = createTooltipElement(text);
  element.appendChild(tooltip);

  element.addEventListener("mouseenter", () =>
    tooltip.classList.add("visible")
  );
  element.addEventListener("mouseleave", () =>
    tooltip.classList.remove("visible")
  );
}

export function createFaceitBadgeElement(
  elo: number | null,
  size: number = 20,
  includeEloText: boolean = true,
  additionalStyles: string = "",
  customDataAttribute: string = "",
  url?: string | null
): HTMLElement {
  const faceitLevel = getFaceitLevel(elo);
  const formattedElo = elo !== null ? elo.toString() : "0000";

  const tooltipWrapper = document.createElement("div");
  tooltipWrapper.className = "tooltip-wrapper";
  tooltipWrapper.setAttribute("tabindex", "0");
  tooltipWrapper.setAttribute(
    "data-clutch-extension",
    customDataAttribute || "faceit-badge-tooltip"
  );

  if (!includeEloText) {
    const faceitIcon = createFaceitImageElement(faceitLevel, size);
    faceitIcon.classList.add("faceit-icon-container");
    const tooltipText =
      elo === null
        ? "No Faceit account found"
        : `Faceit Level: ${faceitLevel}${
            formattedElo ? `, Elo: ${formattedElo}` : ""
          }`;
    addTooltip(faceitIcon, tooltipText);
    tooltipWrapper.appendChild(faceitIcon);
    return tooltipWrapper;
  }

  const faceitBadge = document.createElement("div");
  faceitBadge.className = "faceit-badge clutch-faceit-badge";
  faceitBadge.style.cssText = `--size:${size}px; ${additionalStyles}`;
  faceitBadge.setAttribute(
    "aria-label",
    elo === null
      ? "No Faceit account found"
      : `Faceit Level: ${faceitLevel}, Elo: ${formattedElo}`
  );

  faceitBadge.appendChild(createFaceitImageElement(faceitLevel, size));

  if (formattedElo) {
    const span = document.createElement("span");
    span.className = "clutch-faceit-badge-text";
    span.textContent = formattedElo;
    faceitBadge.appendChild(span);
  }

  if (url) {
    tooltipWrapper.appendChild(wrapInAnchor(faceitBadge, url));
  } else {
    tooltipWrapper.appendChild(faceitBadge);
  }

  return tooltipWrapper;
}

function wrapInAnchor(element: HTMLElement, url: string): HTMLElement {
  const link = document.createElement("a");
  link.className = "clutch-faceit-badge-link";
  link.href = url;
  link.target = "_blank";
  link.appendChild(element);
  return link;
}
