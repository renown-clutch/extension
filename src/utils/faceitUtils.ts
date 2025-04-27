/**
 * Get Faceit level (1-10) based on ELO rating
 */
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
  return 10; // 2001+
}

/**
 * Get path to Faceit level icon SVG based on ELO rating
 */
export function getFaceitLevelIcon(elo: number | null): string {
  const level = getFaceitLevel(elo);

  if (level === 0) return "static/faceitlevels/lvlx.svg";
  return `static/faceitlevels/lvl${level}.svg`;
}

/**
 * Creates a Faceit badge element similar to rank badge
 */
export function createFaceitBadgeElement(
  elo: number | null,
  size: number = 20,
  includeEloText: boolean = true,
  additionalStyles: string = ""
): HTMLElement {
  // Get Faceit level
  const faceitLevel = getFaceitLevel(elo);

  // Format ELO number
  const formattedElo = elo !== null ? elo.toString() : "";

  // Create tooltip wrapper
  const tooltipWrapper = document.createElement("div");
  tooltipWrapper.className = "tooltip-wrapper";
  tooltipWrapper.setAttribute("tabindex", "0");

  // Create badge div with dark background
  const faceitBadge = document.createElement("div");
  faceitBadge.className = "faceit-badge";
  faceitBadge.style.cssText = `
    --size:${size}px; 
    display: flex; 
    align-items: center;
    background-color: #1A1A2E; 
    border-radius: 8px;
    padding: 3px 8px 3px 6px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    ${additionalStyles}
  `;
  faceitBadge.setAttribute(
    "aria-label",
    `Faceit Level: ${faceitLevel}, Elo: ${formattedElo}`
  );

  // Create image container to match badge styling
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

  // Get icon path
  let iconPath: string;
  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      console.warn("Extension context invalid when getting Faceit icon path");
      iconPath = "";
    } else {
      iconPath = chrome.runtime.getURL(
        `static/faceitlevels/lvl${faceitLevel}.svg`
      );
    }
  } catch (error) {
    console.warn("Error getting Faceit icon path:", error);
    iconPath = "";
  }

  // Create image element
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

  // Add image to container
  imgContainer.appendChild(img);

  // Add container to badge
  faceitBadge.appendChild(imgContainer);

  // Add elo text if requested
  if (includeEloText && formattedElo) {
    const span = document.createElement("span");
    span.style.cssText =
      "margin-left: 4px; color: white; font-size: 14px; font-weight: 500;";
    span.textContent = formattedElo;
    faceitBadge.appendChild(span);
  }

  tooltipWrapper.appendChild(faceitBadge);

  return tooltipWrapper;
}
