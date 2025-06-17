import {
  featureRegistry,
  getApiCallMappings,
  getAllFeatures,
} from "./featureRegistry";
import type { UserSettings } from "./types";

// All profile features have been migrated to features/profile/

// Import profile features from new structure
import "$features/profile/friendsList";
import "$features/profile/highestElo";
import "$features/profile/profileButtons";
import "$features/profile/previousBans";
import "$features/profile/linkToCurrentMatch";
import "$features/profile/playerMatchupStats";

// Import sidebar features
import "$features/sidebar/sidebarFriends";

// Import main page features
import "$features/mainPage/lastMatches";
import "$features/mainPage/averagePartyElo";
import "$features/mainPage/clickablePartyUsernames";

// Import match page features
import "$features/match/faceitRanks";
import "$features/match/teamAverageElo";

// Import live match features
import "$features/liveMatch/mapStats";
import "$features/liveMatch/playerStats";
import "$features/liveMatch/liveFaceitRanks";
import "$features/liveMatch/teamAverageEloLive";

// Import automation features
import "$features/automation/matchAutoAccept";
import "$features/automation/partyAutoAccept";

// Import chat features
import "$features/chat/chatWindow";

// Import global features
import "$features/global/navbar";
import "$features/global/keepAlive";

export function generateSettingDefinitions() {
  const definitions: Record<string, any> = {};

  // Include unified features
  featureRegistry.features.forEach((config, settingKey) => {
    definitions[settingKey] = {
      key: settingKey,
      category: config.category,
      defaultValue: config.defaultValue,
      description: config.description,
      handlers: [config.handler],
    };
  });

  return definitions;
}

export function generateDefaultUserSettings(): Partial<UserSettings> {
  const defaults: Record<string, any> = {};

  // Include unified features
  featureRegistry.features.forEach((config, settingKey) => {
    defaults[settingKey] = config.defaultValue;
  });

  return defaults;
}

// Legacy function - now returns all feature keys, not just profile
export function getProfileSettingKeys(): string[] {
  const allKeys = new Set<string>();

  // Add from unified features
  featureRegistry.features.forEach((_, key) => allKeys.add(key));

  return Array.from(allKeys);
}

// New function to get only unified feature keys
export function getAllFeatureKeys(): string[] {
  return Array.from(featureRegistry.features.keys());
}

// Get keys for features of a specific category
export function getFeatureKeysByCategory(category: string): string[] {
  const keys: string[] = [];

  featureRegistry.features.forEach((config, key) => {
    if (config.category === category) {
      keys.push(key);
    }
  });

  return keys;
}

export function getRegisteredApiEvents(): string[] {
  const { requestEvents } = getApiCallMappings();
  return requestEvents;
}

export function getResponseTypeMap(): Record<string, string> {
  const { responseMap } = getApiCallMappings();
  return responseMap;
}

// Call this to ensure all features are loaded
export function initializeFeatureRegistry() {
  console.log(
    `[AutoRegister] 🚀 Loaded ${featureRegistry.features.size} unified features`
  );

  console.log(
    `[AutoRegister] 📡 Registered ${getRegisteredApiEvents().length} API events`
  );
}
