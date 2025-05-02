export type TabName =
  | "Theme"
  | "Auto-accept"
  | "Match"
  | "Sounds"
  | "Profiles"
  | "Settings";

export type Theme =
  | "default"
  | "darkgray"
  | "black"
  | "dark"
  | "pink"
  | "purple"
  | "green";

export type UserSettings = {
  activeTab: TabName;
  selectedTheme: Theme | "";
  showConfirmModal: boolean;
  showInviteModal: boolean;
  csstatsProfileButton: boolean;
  faceitProfileButton: boolean;
  autoAccept: {
    match: boolean;
    party: boolean;
  };
  matchAutoAcceptDelay: number;
  partyAutoAcceptDelay: number;
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
  showFaceitRanksOnMatchPage: boolean;
  showTeamAverageElo: boolean;
  sortFriendsByRenownElo: boolean;
  showSidebarFriendRanks: boolean;
  showExtensionNavbarButton: boolean;
  showHighestElo: boolean;
};

export const defaultUserSettings: UserSettings = {
  activeTab: "Theme",
  selectedTheme: "",
  showConfirmModal: false,
  showInviteModal: false,
  csstatsProfileButton: true,
  faceitProfileButton: true,
  autoAccept: {
    match: false,
    party: false,
  },
  matchAutoAcceptDelay: 3,
  partyAutoAcceptDelay: 3,
  keepAlive: true,
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
  showFaceitRanksOnMatchPage: true,
  showTeamAverageElo: true,
  sortFriendsByRenownElo: false,
  showSidebarFriendRanks: true,
  showExtensionNavbarButton: true,
  showHighestElo: true,
};
