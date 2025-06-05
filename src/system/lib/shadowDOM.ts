import { registerShadowRoot } from "$themes/shadowThemeManager";

/**
 * Creates a shadow root for an element with proper TypeScript types
 * @param element The element to attach the shadow root to
 * @returns The shadow root
 */
export function createShadowRoot(element: HTMLElement): ShadowRoot {
  if (element.shadowRoot) {
    return element.shadowRoot;
  }

  const shadowRoot = element.attachShadow({ mode: "open" });

  // Automatically register the shadow root with the theme system
  registerShadowRoot(shadowRoot);

  return shadowRoot;
}
