import type { UserSettings, SettingCategory } from "./types";
import { getCurrentPage } from "$utils/common/pageUtils";

export interface ApiCall {
  requestType: string;
  responseType: string;
}

// Updated interface for unified features
export interface FeatureConfig {
  // Setting configuration
  settingKey: keyof UserSettings;
  category: SettingCategory;
  defaultValue: any;
  description: string;

  // API configuration (optional)
  apiCalls?: ApiCall[];

  // Handler function
  handler: (settings: UserSettings) => void | Promise<void>;

  // Feature activation logic - determines when this feature should be active
  shouldActivate?: (
    currentPage: ReturnType<typeof getCurrentPage>,
    settings: UserSettings
  ) => boolean;
}

// Keep backward compatibility
export interface ProfileFeatureConfig extends FeatureConfig {
  // Profile features will have default shouldActivate logic
}

export interface FeatureRegistry {
  features: Map<string, FeatureConfig>;
  // Keep for backward compatibility during migration
  profileFeatures: Map<string, ProfileFeatureConfig>;
}

// Global registry
export const featureRegistry: FeatureRegistry = {
  features: new Map(),
  profileFeatures: new Map(),
};

// New unified registration function
export function registerFeature(config: FeatureConfig) {
  // If no shouldActivate function is provided, assume it's always active
  if (!config.shouldActivate) {
    config.shouldActivate = () => true;
  }

  featureRegistry.features.set(config.settingKey, config);
  console.log(`[FeatureRegistry] 📝 Registered feature: ${config.settingKey}`);
}

// Backward compatibility function for profile features
export function registerProfileFeature(config: ProfileFeatureConfig) {
  // Add default shouldActivate logic for profile features
  const profileConfig: FeatureConfig = {
    ...config,
    shouldActivate: (currentPage) => currentPage.type === "profile",
  };

  // Register in both places for backward compatibility
  featureRegistry.features.set(config.settingKey, profileConfig);
  featureRegistry.profileFeatures.set(config.settingKey, config);

  console.log(
    `[FeatureRegistry] 📝 Registered profile feature: ${config.settingKey}`
  );
}

// Get all features that should be active for current page and settings
export function getActiveFeatures(settings: UserSettings): FeatureConfig[] {
  const currentPage = getCurrentPage();
  const activeFeatures: FeatureConfig[] = [];

  featureRegistry.features.forEach((config) => {
    try {
      if (
        config.shouldActivate &&
        config.shouldActivate(currentPage, settings)
      ) {
        activeFeatures.push(config);
      }
    } catch (error) {
      console.error(
        `[FeatureRegistry] ❌ Error checking shouldActivate for ${config.settingKey}:`,
        error
      );
    }
  });

  return activeFeatures;
}

// Legacy functions for backward compatibility
export function getProfileFeatures(): ProfileFeatureConfig[] {
  return Array.from(featureRegistry.profileFeatures.values());
}

export function getAllFeatures(): FeatureConfig[] {
  return Array.from(featureRegistry.features.values());
}

export function getApiCallMappings(): {
  requestEvents: string[];
  responseMap: Record<string, string>;
} {
  const requestEvents: string[] = [];
  const responseMap: Record<string, string> = {};

  // Collect from all features (unified + profile for backward compatibility)
  const allConfigs = [
    ...featureRegistry.features.values(),
    ...featureRegistry.profileFeatures.values(),
  ];

  allConfigs.forEach((config) => {
    if (config.apiCalls) {
      config.apiCalls.forEach((apiCall) => {
        if (!requestEvents.includes(apiCall.requestType)) {
          requestEvents.push(apiCall.requestType);
        }
        responseMap[apiCall.responseType] = apiCall.requestType;
      });
    }
  });

  return { requestEvents, responseMap };
}

// Helper functions for common activation patterns
export const ActivationHelpers = {
  // Only activate on specific page types
  onPageTypes:
    (pageTypes: string[]) => (currentPage: ReturnType<typeof getCurrentPage>) =>
      pageTypes.includes(currentPage.type),

  // Only activate when setting is enabled
  whenEnabled:
    (settingKey: keyof UserSettings) =>
    (currentPage: ReturnType<typeof getCurrentPage>, settings: UserSettings) =>
      !!settings[settingKey],

  // Combine multiple conditions with AND
  and:
    (
      ...conditions: ((
        currentPage: ReturnType<typeof getCurrentPage>,
        settings: UserSettings
      ) => boolean)[]
    ) =>
    (currentPage: ReturnType<typeof getCurrentPage>, settings: UserSettings) =>
      conditions.every((condition) => condition(currentPage, settings)),

  // Combine multiple conditions with OR
  or:
    (
      ...conditions: ((
        currentPage: ReturnType<typeof getCurrentPage>,
        settings: UserSettings
      ) => boolean)[]
    ) =>
    (currentPage: ReturnType<typeof getCurrentPage>, settings: UserSettings) =>
      conditions.some((condition) => condition(currentPage, settings)),

  // Always active (default)
  always: () => true,

  // Never active (for disabled features)
  never: () => false,
};
