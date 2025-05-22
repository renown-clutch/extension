// Configuration settings for the extension
export const config = {
  websocket: {
    stagingUrl: "wss://api-staging.lorem.sh/ws",
    productionUrl: "wss://api.clutch.lorem.sh/ws",
    useStaging: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    heartbeatInterval: 30000,
  },
  storage: {
    steamIdKey: "userSteamId",
  },
  deduplication: {
    messageLimit: 100,
  },
};
