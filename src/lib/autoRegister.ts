import { featureRegistry, getApiCallMappings } from "./featureRegistry";
import type { UserSettings } from "./types";

// Import all profile features to trigger their registration
import "../playerProfile/matchesWithBannedPlayers";
import "../playerProfile/playerMatchupStats";
import "../playerProfile/highestElo";
import "../playerProfile/previousBans";
import "../playerProfile/profileButtons";
import "../playerProfile/linkToCurrentMatch";
// Import other profile features here as we convert them

export function generateSettingDefinitions() {
  const definitions: Record<string, any> = {};

  featureRegistry.profileFeatures.forEach((config, settingKey) => {
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

  featureRegistry.profileFeatures.forEach((config, settingKey) => {
    defaults[settingKey] = config.defaultValue;
  });

  return defaults;
}

export function getProfileSettingKeys(): string[] {
  return Array.from(featureRegistry.profileFeatures.keys());
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
    `[AutoRegister] 🚀 Loaded ${featureRegistry.profileFeatures.size} profile features`
  );
  console.log(
    `[AutoRegister] 📡 Registered ${getRegisteredApiEvents().length} API events`
  );
}
