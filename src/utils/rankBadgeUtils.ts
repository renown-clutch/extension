/**
 * Utilities for creating and displaying Renown rank badges
 */

/**
 * Determines rank tier based on elo
 */
export function getRankTier(elo: number | null): string {
  if (elo === null) return "";
  if (elo >= 25000) return "renowned";
  if (elo >= 22000) return "master";
  if (elo >= 19000) return "diamond";
  if (elo >= 16000) return "platinum";
  if (elo >= 13000) return "gold";
  if (elo >= 10000) return "silver";
  if (elo >= 100) return "bronze";
  return "";
}

/**
 * Formats elo number with comma as thousands separator
 */
export function formatElo(elo: number | null): string {
  if (elo === null) return "";
  return elo.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Gets the path to the rank icon SVG
 */
export function getRankIconPath(rankTier: string): string {
  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      console.warn("Extension context invalid when getting rank icon path");
      return "";
    }
    return chrome.runtime.getURL(`static/renownRanks/${rankTier}.svg`);
  } catch (error) {
    console.warn("Error getting rank icon path:", error);
    return "";
  }
}

/**
 * Creates a rank badge element
 */
export function createRankBadgeElement(
  elo: number | null,
  size: number = 20,
  includeEloText: boolean = true,
  additionalStyles: string = ""
): HTMLElement {
  // Get formatted values
  const formattedElo = formatElo(elo);
  const rankTier = getRankTier(elo);

  const capitalizedRankTier =
    rankTier.charAt(0).toUpperCase() + rankTier.slice(1);

  // Create tooltip wrapper
  const tooltipWrapper = document.createElement("div");
  tooltipWrapper.className = "tooltip-wrapper";
  tooltipWrapper.setAttribute("tabindex", "0");

  // Create rank badge div
  const rankBadge = document.createElement("div");
  rankBadge.className = `rank-badge ${rankTier}`;
  rankBadge.style.cssText = `--size:${size}px; display: flex; align-items: center;${additionalStyles}`;
  rankBadge.setAttribute(
    "aria-label",
    `Rank: ${capitalizedRankTier}, Elo: ${formattedElo}`
  );

  // Create image element
  const img = document.createElement("img");
  img.alt = `Renown rank ${rankTier}`;
  img.width = size;
  img.height = size;
  img.style.color = "transparent";
  img.src = getRankIconPath(rankTier);

  // Add elements to container
  rankBadge.appendChild(img);

  // Add elo text if requested
  if (includeEloText && formattedElo) {
    const span = document.createElement("span");
    span.style.marginLeft = "4px";
    span.textContent = formattedElo;
    rankBadge.appendChild(span);
  }

  tooltipWrapper.appendChild(rankBadge);

  return tooltipWrapper;
}

/**
 * Creates HTML string for a rank badge (legacy method for compatibility)
 */
export function createRankBadgeHtml(
  rankTier: string,
  elo: number | null,
  size: number = 20,
  includeEloText: boolean = true
): string {
  const formattedElo = formatElo(elo);
  const capitalizedRankTier =
    rankTier.charAt(0).toUpperCase() + rankTier.slice(1);

  return `
    <div class="tooltip-wrapper" tabindex="0">
      <div class="rank-badge ${rankTier}" style="--size:${size}px; display: flex; align-items: center;" aria-label="Rank: ${capitalizedRankTier}, Elo: ${formattedElo}">
        <img alt="Renown rank ${rankTier}" loading="lazy" width="${size}" height="${size}" decoding="async" data-nimg="1" style="color:transparent" src="${getRankIconPath(
    rankTier
  )}">
        ${
          includeEloText
            ? `<span style="margin-left: 4px;">${formattedElo}</span>`
            : ""
        }
      </div>
    </div>
  `;
}
