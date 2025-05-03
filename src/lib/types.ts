export type TabName =
  | "Theme"
  | "Auto-accept"
  | "Match"
  | "Sounds"
  | "Profiles"
  | "Settings"
  | "Friends";

export type Theme =
  | "default"
  | "darkgray"
  | "black"
  | "dark"
  | "pink"
  | "purple"
  | "green";

export type MatchFoundSound = "none" | "howl";

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
  showFriendListRanks: boolean;
  showFaceitRanksOnMatchPage: boolean;
  showTeamAverageElo: boolean;
  sortFriendsByRenownElo: boolean;
  showSidebarFriendRanks: boolean;
  showExtensionNavbarButton: boolean;
  showHighestElo: boolean;
  matchFoundSound: MatchFoundSound;
  matchFoundVolume: number;
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
  showFriendListRanks: true,
  showFaceitRanksOnMatchPage: true,
  showTeamAverageElo: true,
  sortFriendsByRenownElo: false,
  showSidebarFriendRanks: true,
  showExtensionNavbarButton: true,
  showHighestElo: true,
  matchFoundSound: "none",
  matchFoundVolume: 70,
};
