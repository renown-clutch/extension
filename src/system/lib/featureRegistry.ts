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

  // Optional unique identifier for features that share setting keys
  featureId?: string;

  // API configuration (optional)
  apiCalls?: ApiCall[];

  // Handler functions
  handler: (settings: UserSettings) => void | Promise<void>;
  cleanupHandler?: (settings: UserSettings) => void | Promise<void>;

  // Feature activation logic - determines when this feature should be active
  shouldActivate?: (
    currentPage: ReturnType<typeof getCurrentPage>,
    settings: UserSettings
  ) => boolean;

  // Dependency tracking - which settings this feature depends on
  dependsOn?: (keyof UserSettings)[];
}

// Keep backward compatibility
export interface ProfileFeatureConfig extends FeatureConfig {
  // Profile features will have default shouldActivate logic
}

export interface FeatureRegistry {
  features: Map<string, FeatureConfig>;
}

// Global registry
export const featureRegistry: FeatureRegistry = {
  features: new Map(),
};

// New unified registration function
export function registerFeature(config: FeatureConfig) {
  // If no shouldActivate function is provided, assume it's always active
  if (!config.shouldActivate) {
    config.shouldActivate = () => true;
  }

  // Use featureId if provided, otherwise fall back to settingKey
  const uniqueId = config.featureId || config.settingKey;

  featureRegistry.features.set(uniqueId, config);
  console.log(
    `[FeatureRegistry] 📝 Registered feature: ${config.settingKey}${
      config.featureId ? ` (${config.featureId})` : ""
    }`
  );
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

  console.log(
    `[FeatureRegistry] 📝 Registered profile feature: ${config.settingKey}`
  );
}

// Get all features that should be active for current page and settings
export function getActiveFeatures(settings: UserSettings): FeatureConfig[] {
  const currentPage = getCurrentPage();
  const activeFeatures: FeatureConfig[] = [];

  console.log(
    "[FeatureRegistry] Determining active features for:",
    currentPage
  );

  featureRegistry.features.forEach((config) => {
    try {
      if (
        config.shouldActivate &&
        config.shouldActivate(currentPage, settings)
      ) {
        console.log(
          `[FeatureRegistry] ✅ Feature ${config.settingKey} should be active`
        );
        activeFeatures.push(config);
      } else {
        // Let's check specifically for match features to debug
        if (
          config.settingKey === "showFaceitRanksOnMatchPage" ||
          config.settingKey === "showTeamAverageElo"
        ) {
          console.log(
            `[FeatureRegistry] ❌ Match feature ${config.settingKey} should NOT be active:`,
            {
              hasActivationFunction: !!config.shouldActivate,
              settingValue: settings[config.settingKey],
              currentPage: currentPage,
            }
          );
        }
      }
    } catch (error) {
      console.error(
        `[FeatureRegistry] ❌ Error checking shouldActivate for ${config.settingKey}:`,
        error
      );
    }
  });

  console.log(
    `[FeatureRegistry] Active features (${activeFeatures.length}):`,
    activeFeatures.map((f) => f.settingKey)
  );
  return activeFeatures;
}

// Get features that need cleanup based on changed settings
export function getFeaturesNeedingCleanup(
  previouslyActiveKeys: Set<string>,
  currentlyActiveKeys: Set<string>
): FeatureConfig[] {
  const featuresNeedingCleanup: FeatureConfig[] = [];

  // Find features that were active but are no longer active
  for (const featureKey of previouslyActiveKeys) {
    if (!currentlyActiveKeys.has(featureKey)) {
      const config = featureRegistry.features.get(featureKey);
      if (config && config.cleanupHandler) {
        featuresNeedingCleanup.push(config);
      }
    }
  }

  return featuresNeedingCleanup;
}

// Get features that are affected by changed settings
export function getAffectedFeatures(
  changedSettings: Partial<UserSettings>
): FeatureConfig[] {
  const affectedFeatures: FeatureConfig[] = [];
  const changedKeys = new Set(
    Object.keys(changedSettings) as (keyof UserSettings)[]
  );

  featureRegistry.features.forEach((config) => {
    // Check if this feature's own setting was changed
    if (changedKeys.has(config.settingKey)) {
      affectedFeatures.push(config);
      return;
    }

    // Check if this feature depends on any of the changed settings
    if (config.dependsOn) {
      const hasChangedDependency = config.dependsOn.some((dep) =>
        changedKeys.has(dep)
      );
      if (hasChangedDependency) {
        affectedFeatures.push(config);
      }
    }
  });

  return affectedFeatures;
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
  const allConfigs = [...featureRegistry.features.values()];

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
    (pageTypes: string[]) =>
    (currentPage: ReturnType<typeof getCurrentPage>) => {
      const result = pageTypes.includes(currentPage.type);
      console.log(
        `[ActivationHelpers] onPageTypes(${JSON.stringify(
          pageTypes
        )}): currentPage.type=${currentPage.type}, result=${result}`
      );
      return result;
    },

  // Only activate when setting is enabled
  whenEnabled:
    (settingKey: keyof UserSettings) =>
    (
      currentPage: ReturnType<typeof getCurrentPage>,
      settings: UserSettings
    ) => {
      const result = !!settings[settingKey];
      console.log(
        `[ActivationHelpers] whenEnabled(${settingKey}): value=${settings[settingKey]}, result=${result}`
      );
      return result;
    },

  // Combine multiple conditions with AND
  and:
    (
      ...conditions: ((
        currentPage: ReturnType<typeof getCurrentPage>,
        settings: UserSettings
      ) => boolean)[]
    ) =>
    (
      currentPage: ReturnType<typeof getCurrentPage>,
      settings: UserSettings
    ) => {
      console.log(
        `[ActivationHelpers] and: evaluating ${conditions.length} conditions`
      );
      const results = conditions.map((condition, index) => {
        const result = condition(currentPage, settings);
        console.log(`[ActivationHelpers] and: condition ${index} = ${result}`);
        return result;
      });
      const finalResult = results.every((r) => r);
      console.log(`[ActivationHelpers] and: final result = ${finalResult}`);
      return finalResult;
    },

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
