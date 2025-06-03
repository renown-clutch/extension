export const config = {
  socketio: {
    stagingUrl: "http://localhost:80",
    productionUrl: "https://apiv2.goclutch.pro",
    useStaging: false,
    maxReconnectAttempts: 10,
    reconnectDelay: 3000,
    heartbeatInterval: 30000,
  },
  storage: {
    steamIdKey: "userSteamId",
  },
  deduplication: {
    messageLimit: 20,
  },
  debug: {
    enableFileUrlSupport: false,
    enableConsoleLogging: false,
  },
};
