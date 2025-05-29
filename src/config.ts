export const config = {
  socketio: {
    // stagingUrl: "https://api-staging.goclutch.pro",
    stagingUrl: "http://localhost:80",
    productionUrl: "https://api.goclutch.pro",
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
