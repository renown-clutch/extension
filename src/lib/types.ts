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
  profileButtons: {
    csstats: boolean;
    faceit: boolean;
  };
  autoAccept: {
    match: boolean;
    party: boolean;
  };
};

export const defaultUserSettings: UserSettings = {
  activeTab: "Theme",
  selectedTheme: "",
  showConfirmModal: false,
  profileButtons: {
    csstats: true,
    faceit: true,
  },
  autoAccept: {
    match: false,
    party: false,
  },
};
