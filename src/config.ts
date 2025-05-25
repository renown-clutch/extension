// Configuration settings for the extension
export const config = {
  websocket: {
    stagingUrl: "wss://api-staging.goclutch.pro/ws",
    productionUrl: "wss://api.goclutch.pro/ws",
    useStaging: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    heartbeatInterval: 30000,
  },
  storage: {
    steamIdKey: "userSteamId",
  },
  deduplication: {
    messageLimit: 20,
  },
};
