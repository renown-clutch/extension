/**
 * Clutch Extension - Animation Utilities
 *
 * Helper functions to easily apply shared animations to extension elements.
 * This ensures consistent animation patterns across all features.
 */

export type AnimationType =
  | "fade-in"
  | "fade-in-slide"
  | "fade-in-slide-delayed"
  | "fade-in-down"
  | "fade-in-up"
  | "fade-in-scale"
  | "fade-in-scale-delayed"
  | "chat-icon";

export type AnimationTiming = "fast" | "normal" | "slow";

export type AnimationDelay = "none" | "short" | "medium" | "long";

/**
 * Apply a shared animation to an element
 * @param element - The HTML element to animate
 * @param type - The type of animation to apply
 * @param timing - Animation duration (optional)
 * @param delay - Animation delay (optional)
 */
export function applyAnimation(
  element: HTMLElement,
  type: AnimationType,
  timing?: AnimationTiming,
  delay?: AnimationDelay
): void {
  // Base animation class
  const baseClass = `clutch-animate-${type}`;

  // Build class list
  const classes = [baseClass];

  // Add timing modifier
  if (timing) {
    classes.push(`clutch-animate-${timing}`);
  }

  // Add delay modifier
  if (delay) {
    classes.push(`clutch-animate-delay-${delay}`);
  }

  // Apply classes
  element.classList.add(...classes);
}

/**
 * Remove animation classes from an element
 * @param element - The HTML element to remove animations from
 */
export function removeAnimation(element: HTMLElement): void {
  const animationClasses = Array.from(element.classList).filter((className) =>
    className.startsWith("clutch-animate-")
  );

  element.classList.remove(...animationClasses);
}

/**
 * Quick animation presets for common use cases
 */
export const AnimationPresets = {
  // Main page features
  partyEloDisplay: () => "clutch-animate-fade-in-slide",
  faceitBadge: () => "clutch-animate-fade-in-up",
  averageBadge: () => "clutch-animate-fade-in-scale",
  lastMatches: () => "clutch-animate-fade-in-down",

  // Sidebar features
  friendRank: () => "clutch-animate-fade-in-scale-delayed",

  // Global features
  navbarButton: () => "clutch-animate-fade-in-slide-delayed",

  // Chat features
  minimizedIcon: () => "clutch-animate-chat-icon",

  // Generic animations
  fadeIn: () => "clutch-animate-fade-in",
  slideIn: () => "clutch-animate-fade-in-slide",
  scaleIn: () => "clutch-animate-fade-in-scale",
} as const;

/**
 * Apply a preset animation to an element
 * @param element - The HTML element to animate
 * @param preset - The preset animation to apply
 */
export function applyPresetAnimation(
  element: HTMLElement,
  preset: keyof typeof AnimationPresets
): void {
  const className = AnimationPresets[preset]();
  element.classList.add(className);
}

/**
 * Create and return an element with animation applied
 * @param tagName - HTML tag name to create
 * @param animation - Animation type to apply
 * @param options - Additional options
 */
export function createAnimatedElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  animation: AnimationType,
  options?: {
    timing?: AnimationTiming;
    delay?: AnimationDelay;
    className?: string;
    attributes?: Record<string, string>;
  }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  // Apply animation
  applyAnimation(element, animation, options?.timing, options?.delay);

  // Apply additional class if provided
  if (options?.className) {
    element.classList.add(options.className);
  }

  // Apply attributes if provided
  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
}
