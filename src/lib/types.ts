export type TabName =
  | "Theme"
  | "Auto-accept"
  | "Map voting"
  | "Sounds"
  | "Bans"
  | "Settings";

export type UserSettings = {
  activeTab: TabName;
  selectedTheme: "" | "light" | "dark" | "default";
  showConfirmModal: boolean;
};

export const defaultUserSettings: UserSettings = {
  activeTab: "Theme",
  selectedTheme: "",
  showConfirmModal: false,
};
