import { initializeProfileButtons } from "../playerProfile/profileButtons";
import { initializeProfileBans } from "../playerProfile/previousBans";
import { initializeFriendsList } from "../playerProfile/friendsList";
import { initializeSidebarFriends } from "../playerProfile/sidebarFriends";
import { initializeHighestElo } from "../playerProfile/highestElo";
import { initializeExtensionButton } from "../navbar/extensionButton";
import { initializeMatchPage } from "../matchPage/initializeMatchPage";
import { initializeLiveMatchPage } from "../liveMatchPage/intializeLiveMatchPage";
import { initializeLivePlayerStats } from "../liveMatchPage/livePlayerStats";
import { initializeLinkToCurrentMatch } from "../playerProfile/linkToCurrentMatch";
import { initializeMainPage } from "../mainPage/initMainPage";
import { initializeChatWindow } from "../chat/chatWindow";
import { initializeMatchFoundAutoAccept } from "../autoAccept/matchFoundModal";
import { initializeAutoAcceptPartyInvite } from "../autoAccept/partyInviteModal";
import { initializeKeepAlive } from "../keepAlive/keepAlive";
import { initializePlayerMatchupStats } from "../playerProfile/playerMatchupStats";
import { initializeMatchesWithBannedPlayersCheck } from "../playerProfile/matchesWithBannedPlayers";

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
  showMapStatsColors: boolean;
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
    handlers: [initializeProfileButtons],
  },
  faceitProfileButton: {
    key: "faceitProfileButton",
    category: "profile",
    defaultValue: true,
    description: "Show Faceit profile button",
    handlers: [initializeProfileButtons],
  },
  showLinkToCurrentMatch: {
    key: "showLinkToCurrentMatch",
    category: "profile",
    defaultValue: true,
    description: "Show link to current match",
    handlers: [initializeLinkToCurrentMatch],
  },
  autoAccept: {
    key: "autoAccept",
    category: "autoAccept",
    defaultValue: {
      match: false,
      party: false,
    },
    description: "Auto accept settings for match and party",
    handlers: [initializeMatchFoundAutoAccept],
  },
  matchAutoAcceptDelay: {
    key: "matchAutoAcceptDelay",
    category: "autoAccept",
    defaultValue: 3,
    description: "Delay before auto accepting match",
    handlers: [initializeMatchFoundAutoAccept],
  },
  partyAutoAcceptDelay: {
    key: "partyAutoAcceptDelay",
    category: "autoAccept",
    defaultValue: 3,
    description: "Delay before auto accepting party invite",
    handlers: [initializeAutoAcceptPartyInvite],
  },
  keepAlive: {
    key: "keepAlive",
    category: "general",
    defaultValue: true,
    description: "Keep the extension alive",
    handlers: [initializeKeepAlive],
  },
  showBans: {
    key: "showBans",
    category: "profile",
    defaultValue: true,
    description: "Show ban information",
    handlers: [initializeProfileBans],
  },
  showFriendListRanks: {
    key: "showFriendListRanks",
    category: "friends",
    defaultValue: true,
    description: "Show ranks in friend list",
    handlers: [initializeFriendsList],
  },
  showFaceitRanksOnMatchPage: {
    key: "showFaceitRanksOnMatchPage",
    category: "match",
    defaultValue: true,
    description: "Show Faceit ranks on match page",
    handlers: [initializeMatchPage, initializeLiveMatchPage],
  },
  showTeamAverageElo: {
    key: "showTeamAverageElo",
    category: "match",
    defaultValue: true,
    description: "Show team average ELO",
    handlers: [initializeMatchPage, initializeLiveMatchPage],
  },
  sortFriendsByRenownElo: {
    key: "sortFriendsByRenownElo",
    category: "friends",
    defaultValue: false,
    description: "Sort friends by Renown ELO",
    handlers: [initializeFriendsList],
  },
  showSidebarFriendRanks: {
    key: "showSidebarFriendRanks",
    category: "friends",
    defaultValue: true,
    description: "Show friend ranks in sidebar",
    handlers: [initializeSidebarFriends],
  },
  showExtensionNavbarButton: {
    key: "showExtensionNavbarButton",
    category: "general",
    defaultValue: true,
    description: "Show extension button in navbar",
    handlers: [initializeExtensionButton],
  },
  showHighestElo: {
    key: "showHighestElo",
    category: "profile",
    defaultValue: true,
    description: "Show highest ELO",
    handlers: [initializeHighestElo],
  },
  matchFoundSound: {
    key: "matchFoundSound",
    category: "sound",
    defaultValue: "none",
    description: "Sound to play when match is found",
    handlers: [initializeMatchFoundAutoAccept],
  },
  matchFoundVolume: {
    key: "matchFoundVolume",
    category: "sound",
    defaultValue: 70,
    description: "Volume for match found sound",
    handlers: [initializeMatchFoundAutoAccept],
  },
  showMapStats: {
    key: "showMapStats",
    category: "match",
    defaultValue: true,
    description: "Show map statistics",
    handlers: [initializeLiveMatchPage],
  },
  showMapStatsColors: {
    key: "showMapStatsColors",
    category: "match",
    defaultValue: true,
    description: "Show map statistics colors",
    handlers: [initializeLiveMatchPage],
  },
  liveMatchPlayerStats: {
    key: "liveMatchPlayerStats",
    category: "match",
    defaultValue: true,
    description: "Show live match player statistics",
    handlers: [initializeLiveMatchPage],
  },
  showLiveMatchPlayerStreak: {
    key: "showLiveMatchPlayerStreak",
    category: "match",
    defaultValue: true,
    description: "Show live match player streak",
    handlers: [initializeLiveMatchPage],
  },
  showLastPlayedMatches: {
    key: "showLastPlayedMatches",
    category: "mainPage",
    defaultValue: true,
    description: "Show last played matches",
    handlers: [initializeMainPage],
  },
  showAveragePartyElo: {
    key: "showAveragePartyElo",
    category: "mainPage",
    defaultValue: true,
    description: "Show average party ELO",
    handlers: [initializeMainPage],
  },
  showFaceitEloOnPartyList: {
    key: "showFaceitEloOnPartyList",
    category: "mainPage",
    defaultValue: false,
    description: "Show Faceit ELO on party list",
    handlers: [initializeMainPage],
  },
  enableClickablePartyUsernames: {
    key: "enableClickablePartyUsernames",
    category: "mainPage",
    defaultValue: true,
    description: "Make party usernames clickable links to profiles",
    handlers: [initializeMainPage],
  },
  showChatWindow: {
    key: "showChatWindow",
    category: "chat",
    defaultValue: true,
    description: "Show chat window",
    handlers: [initializeChatWindow],
  },
  playerMatchupStats: {
    key: "playerMatchupStats",
    category: "profile",
    defaultValue: true,
    description: "Show matchup stats on player profiles",
    handlers: [initializePlayerMatchupStats],
  },
  checkMatchesWithBannedPlayers: {
    key: "checkMatchesWithBannedPlayers",
    category: "profile",
    defaultValue: true,
    description: "Check and highlight matches with banned players",
    handlers: [initializeMatchesWithBannedPlayersCheck],
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
