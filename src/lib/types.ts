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
    };
    partyInvite: {
      volume: number;
    };
  };
  showFriendListRanks: boolean;
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
    },
    partyInvite: {
      volume: 70,
    },
  },
  showFriendListRanks: true,
};
