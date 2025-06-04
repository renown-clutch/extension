import type { UserSettings, SettingCategory } from "./types";

export interface ApiCall {
  requestType: string;
  responseType: string;
}

export interface ProfileFeatureConfig {
  // Setting configuration
  settingKey: keyof UserSettings;
  category: SettingCategory;
  defaultValue: any;
  description: string;

  // API configuration (optional)
  apiCalls?: ApiCall[];

  // Handler function
  handler: (settings: UserSettings) => void | Promise<void>;
}

export interface FeatureRegistry {
  profileFeatures: Map<string, ProfileFeatureConfig>;
}

// Global registry
export const featureRegistry: FeatureRegistry = {
  profileFeatures: new Map(),
};

export function registerProfileFeature(config: ProfileFeatureConfig) {
  featureRegistry.profileFeatures.set(config.settingKey, config);
  console.log(
    `[FeatureRegistry] 📝 Registered profile feature: ${config.settingKey}`
  );
}

export function getProfileFeatures(): ProfileFeatureConfig[] {
  return Array.from(featureRegistry.profileFeatures.values());
}

export function getApiCallMappings(): {
  requestEvents: string[];
  responseMap: Record<string, string>;
} {
  const requestEvents: string[] = [];
  const responseMap: Record<string, string> = {};

  featureRegistry.profileFeatures.forEach((config) => {
    if (config.apiCalls) {
      config.apiCalls.forEach((apiCall) => {
        requestEvents.push(apiCall.requestType);
        responseMap[apiCall.responseType] = apiCall.requestType;
      });
    }
  });

  return { requestEvents, responseMap };
}
