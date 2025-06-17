// All feature initialization is now handled by the unified feature registry system
// No need to import individual initialization functions

export type TabName =
  | "Theme"
  | "Auto-accept"
  | "Match"
  | "Sounds"
  | "Profiles"
  | "Settings"
  | "Friends"
  | "MainPage"
  | "Chat";

export type Theme =
  | "default"
  | "darkgray"
  | "black"
  | "dark"
  | "pink"
  | "purple"
  | "green"
  | "oled";

export type MatchFoundSound =
  | "none"
  | "howl"
  | "rock"
  | "trumpet"
  | "ah_shit"
  | "ok_letsgo";

export const soundFileMap: Record<MatchFoundSound, string> = {
  none: "",
  howl: "howl.mp3",
  rock: "rock.wav",
  trumpet: "trumpet.mp3",
  ah_shit: "ah_shit.mp3",
  ok_letsgo: "ok_letsgo.mp3",
};

export type UserSettings = {
  activeTab: TabName;
  selectedTheme: Theme | "";
  showConfirmModal: boolean;
  showInviteModal: boolean;
  csstatsProfileButton: boolean;
  faceitProfileButton: boolean;
  showLinkToCurrentMatch: boolean;
  autoAccept: {
    match: boolean;
    party: boolean;
  };
  matchAutoAcceptDelay: number;
  partyAutoAcceptDelay: number;
  keepAlive: boolean;
  showBans: boolean;
  showFriendListRanks: boolean;
  showFaceitRanksOnMatchPage: boolean;
  showTeamAverageElo: boolean;
  sortFriendsByRenownElo: boolean;
  showSidebarFriendRanks: boolean;
  showExtensionNavbarButton: boolean;
  showHighestElo: boolean;
  matchFoundSound: MatchFoundSound;
  matchFoundVolume: number;
  showMapStats: boolean;
  liveMatchPlayerStats: boolean;
  showLiveMatchPlayerStreak: boolean;
  showLastPlayedMatches: boolean;
  showAveragePartyElo: boolean;
  showFaceitEloOnPartyList: boolean;
  enableClickablePartyUsernames: boolean;
  showChatWindow: boolean;
  playerMatchupStats: boolean;
  checkMatchesWithBannedPlayers: boolean;
};

export type SettingCategory =
  | "theme"
  | "profile"
  | "match"
  | "sound"
  | "autoAccept"
  | "friends"
  | "mainPage"
  | "general"
  | "chat";

export type SettingHandler = (
  settings: UserSettings,
  value?: any
) => void | Promise<void>;

export interface SettingDefinition<T> {
  key: keyof UserSettings;
  category: SettingCategory;
  defaultValue: T;
  description?: string;
  handlers?: SettingHandler[];
}

export const SETTING_DEFINITIONS: Record<
  keyof UserSettings,
  SettingDefinition<any>
> = {
  activeTab: {
    key: "activeTab",
    category: "general",
    defaultValue: "Theme",
    description: "The currently active tab in the popup",
  },
  selectedTheme: {
    key: "selectedTheme",
    category: "theme",
    defaultValue: "dark",
    description: "The selected theme for the extension",
  },
  showConfirmModal: {
    key: "showConfirmModal",
    category: "general",
    defaultValue: false,
    description: "Whether to show the confirm modal",
  },
  showInviteModal: {
    key: "showInviteModal",
    category: "general",
    defaultValue: false,
    description: "Whether to show the invite modal",
  },
  csstatsProfileButton: {
    key: "csstatsProfileButton",
    category: "profile",
    defaultValue: true,
    description: "Show CSStats profile button",
  },
  faceitProfileButton: {
    key: "faceitProfileButton",
    category: "profile",
    defaultValue: true,
    description: "Show Faceit profile button",
  },
  showLinkToCurrentMatch: {
    key: "showLinkToCurrentMatch",
    category: "profile",
    defaultValue: true,
    description: "Show link to current match",
  },
  autoAccept: {
    key: "autoAccept",
    category: "autoAccept",
    defaultValue: {
      match: false,
      party: false,
    },
    description: "Auto accept settings for match and party",
  },
  matchAutoAcceptDelay: {
    key: "matchAutoAcceptDelay",
    category: "autoAccept",
    defaultValue: 3,
    description: "Delay before auto accepting match",
  },
  partyAutoAcceptDelay: {
    key: "partyAutoAcceptDelay",
    category: "autoAccept",
    defaultValue: 3,
    description: "Delay before auto accepting party invite",
  },
  keepAlive: {
    key: "keepAlive",
    category: "general",
    defaultValue: true,
    description: "Keep the extension alive",
  },
  showBans: {
    key: "showBans",
    category: "profile",
    defaultValue: true,
    description: "Show ban information",
  },
  showFriendListRanks: {
    key: "showFriendListRanks",
    category: "friends",
    defaultValue: true,
    description: "Show ranks in friend list",
  },
  showFaceitRanksOnMatchPage: {
    key: "showFaceitRanksOnMatchPage",
    category: "match",
    defaultValue: true,
    description: "Show Faceit ranks on match page",
  },
  showTeamAverageElo: {
    key: "showTeamAverageElo",
    category: "match",
    defaultValue: true,
    description: "Show team average ELO",
  },
  sortFriendsByRenownElo: {
    key: "sortFriendsByRenownElo",
    category: "friends",
    defaultValue: false,
    description: "Sort friends by Renown ELO",
  },
  showSidebarFriendRanks: {
    key: "showSidebarFriendRanks",
    category: "friends",
    defaultValue: true,
    description: "Show friend ranks in sidebar",
  },
  showExtensionNavbarButton: {
    key: "showExtensionNavbarButton",
    category: "general",
    defaultValue: true,
    description: "Show extension button in navbar",
  },
  showHighestElo: {
    key: "showHighestElo",
    category: "profile",
    defaultValue: true,
    description: "Show highest ELO",
  },
  matchFoundSound: {
    key: "matchFoundSound",
    category: "sound",
    defaultValue: "none",
    description: "Sound to play when match is found",
  },
  matchFoundVolume: {
    key: "matchFoundVolume",
    category: "sound",
    defaultValue: 70,
    description: "Volume for match found sound",
  },
  showMapStats: {
    key: "showMapStats",
    category: "match",
    defaultValue: true,
    description: "Show map statistics",
  },
  liveMatchPlayerStats: {
    key: "liveMatchPlayerStats",
    category: "match",
    defaultValue: true,
    description: "Show live match player statistics",
  },
  showLiveMatchPlayerStreak: {
    key: "showLiveMatchPlayerStreak",
    category: "match",
    defaultValue: true,
    description: "Show live match player streak",
  },
  showLastPlayedMatches: {
    key: "showLastPlayedMatches",
    category: "mainPage",
    defaultValue: true,
    description: "Show last played matches",
  },
  showAveragePartyElo: {
    key: "showAveragePartyElo",
    category: "mainPage",
    defaultValue: true,
    description: "Show average party ELO",
  },
  showFaceitEloOnPartyList: {
    key: "showFaceitEloOnPartyList",
    category: "mainPage",
    defaultValue: false,
    description: "Show Faceit ELO on party list",
  },
  enableClickablePartyUsernames: {
    key: "enableClickablePartyUsernames",
    category: "mainPage",
    defaultValue: true,
    description: "Make party usernames clickable links to profiles",
  },
  showChatWindow: {
    key: "showChatWindow",
    category: "chat",
    defaultValue: true,
    description: "Show chat window",
  },
  playerMatchupStats: {
    key: "playerMatchupStats",
    category: "profile",
    defaultValue: true,
    description: "Show matchup stats on player profiles",
  },
  checkMatchesWithBannedPlayers: {
    key: "checkMatchesWithBannedPlayers",
    category: "profile",
    defaultValue: true,
    description: "Check and highlight matches with banned players",
  },
};

export const defaultUserSettings: UserSettings = Object.entries(
  SETTING_DEFINITIONS
).reduce(
  (acc, [key, def]) => ({
    ...acc,
    [key]: def.defaultValue,
  }),
  {} as UserSettings
);
