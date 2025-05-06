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
  imgContainer.style.cssText = `
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${size}px;
    height: ${size}px;
    margin-right: 2px;
  `;

  let iconPath = "";
  if (faceitLevel === 0) {
    iconPath = chrome.runtime.getURL("static/faceitlevels/lvlx.svg");
  } else {
    iconPath = chrome.runtime.getURL(
      `static/faceitlevels/lvl${faceitLevel}.svg`
    );
  }

  const img = document.createElement("img");
  img.alt = `Faceit level ${faceitLevel}`;
  img.width = size;
  img.height = size;
  img.style.color = "transparent";
  img.style.cssText = `
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  `;
  img.src = iconPath;

  imgContainer.appendChild(img);
  return imgContainer;
}

export function createTooltipElement(text: string): HTMLElement {
  const tooltip = document.createElement("div");
  tooltip.className = "clutch-tooltip";
  tooltip.textContent = text;
  Object.assign(tooltip.style, {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "white",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    whiteSpace: "nowrap",
    zIndex: "9999",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity 0.1s",
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    marginBottom: "5px",
  });
  return tooltip;
}

export function addTooltip(element: HTMLElement, text: string): void {
  // Ensure the element has position relative for proper tooltip positioning
  if (window.getComputedStyle(element).position === "static") {
    element.style.position = "relative";
  }

  const tooltip = createTooltipElement(text);
  element.appendChild(tooltip);

  element.addEventListener("mouseenter", () => (tooltip.style.opacity = "1"));
  element.addEventListener("mouseleave", () => (tooltip.style.opacity = "0"));
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
  faceitBadge.className = "faceit-badge";
  faceitBadge.style.cssText = `--size:${size}px; 
    display: flex; 
    align-items: center;
    background-color: var(--slate-700); 
    border-radius: 20px;
    padding: 2px 10px 2px 2px;
    
    ${additionalStyles}
  `;
  faceitBadge.setAttribute(
    "aria-label",
    elo === null
      ? "No Faceit account found"
      : `Faceit Level: ${faceitLevel}, Elo: ${formattedElo}`
  );

  faceitBadge.appendChild(createFaceitImageElement(faceitLevel, size));

  if (formattedElo) {
    const span = document.createElement("span");
    span.style.cssText =
      "margin-left: 4px; color: white; font-size: 14px; font-weight: 500;";
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
  link.href = url;
  link.target = "_blank";
  link.style.cursor = "pointer";
  link.appendChild(element);
  return link;
}
