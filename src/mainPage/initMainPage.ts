import type { UserSettings } from "$lib/types";
import { getCurrentPage } from "../utils/pageUtils";
import { initializeLastMatches } from "./lastMatches";
import { initializeAveragePartyElo } from "./averagePartyElo";
import { initializeClickablePartyUsernames } from "./clickablePartyUsernames";

export function isMainPage(): boolean {
  return getCurrentPage().type === "play";
}

export async function initializeMainPage(
  userSettings: UserSettings
): Promise<void> {
  if (!isMainPage()) {
    return;
  }

  initializeLastMatches(userSettings);

  initializeAveragePartyElo(userSettings);

  await initializeClickablePartyUsernames(userSettings);
}
