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
