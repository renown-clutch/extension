import browserAPI from "../lib/browserAPI";

export async function getStoredUIState(key: string): Promise<boolean> {
  try {
    const result = (await browserAPI.storage.local.get(key)) as Record<
      string,
      boolean
    >;
    return result[key] ?? false; // Default to false (collapsed/minimized)
  } catch (error) {
    return false; // Default to false on error
  }
}

export async function saveUIState(key: string, state: boolean): Promise<void> {
  try {
    await browserAPI.storage.local.set({ [key]: state });
  } catch (error) {
    // Silently fail
  }
}
