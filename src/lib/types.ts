export type TabName =
  | "Theme"
  | "Auto-accept"
  | "Map voting"
  | "Sounds"
  | "Profiles"
  | "Settings";

export type UserSettings = {
  activeTab: TabName;
  selectedTheme: "" | "light" | "dark" | "default";
  showConfirmModal: boolean;
  showInviteModal: boolean;
  profileButtons: {
    csstats: boolean;
    faceit: boolean;
  };
  autoAccept: {
    match: boolean;
    party: boolean;
  };
  keepAlive: boolean;
  showBans: boolean;
  showSkinDrops: boolean;
  sounds: {
    matchFound: {
      volume: number;
      enabled: boolean;
      customSound: string | null;
    };
    partyInvite: {
      volume: number;
      enabled: boolean;
      customSound: string | null;
    };
  };
};

export const defaultUserSettings: UserSettings = {
  activeTab: "Theme",
  selectedTheme: "",
  showConfirmModal: false,
  showInviteModal: false,
  profileButtons: {
    csstats: true,
    faceit: true,
  },
  autoAccept: {
    match: false,
    party: false,
  },
  keepAlive: false,
  showBans: true,
  showSkinDrops: true,
  sounds: {
    matchFound: {
      volume: 70,
      enabled: true,
      customSound: null,
    },
    partyInvite: {
      volume: 70,
      enabled: true,
      customSound: null,
    },
  },
};
