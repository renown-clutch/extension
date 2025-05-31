import { config } from "../config";

export type PageType =
  | { type: "home" }
  | { type: "profile"; id: string }
  | { type: "profileSettings" }
  | { type: "admin" }
  | { type: "matchPage"; id: string }
  | { type: "playMatch" }
  | { type: "banlist" }
  | { type: "drops" }
  | { type: "feedback" }
  | { type: "play" }
  | { type: "unknown" };

type RouteMatcher = {
  pattern: RegExp | string;
  handler: (matches: RegExpMatchArray | null) => PageType;
};

const ROUTE_MATCHERS: RouteMatcher[] = [
  {
    pattern: "renown.gg/admin",
    handler: () => ({ type: "admin" }),
  },
  {
    pattern: /^\/$/,
    handler: () => ({ type: "home" }),
  },
  {
    pattern: /^\/play$/,
    handler: () => ({ type: "play" }),
  },
  {
    pattern: /^\/play\/match$/,
    handler: () => ({ type: "playMatch" }),
  },
  {
    pattern: /^\/banlist$/,
    handler: () => ({ type: "banlist" }),
  },
  {
    pattern: /^\/drops$/,
    handler: () => ({ type: "drops" }),
  },
  {
    pattern: /^\/feedback/,
    handler: () => ({ type: "feedback" }),
  },
  {
    pattern: /^\/profile\/settings/,
    handler: () => ({ type: "profileSettings" }),
  },
  {
    pattern: /^\/profile\/(\d+)(?:\/.*)?$/,
    handler: (matches) => ({ type: "profile", id: matches![1] }),
  },
  {
    pattern: /^\/match\/(\d+)$/,
    handler: (matches) => ({ type: "matchPage", id: matches![1] }),
  },
];

export function getCurrentPage(): PageType {
  const url = window.location.href;
  const path = new URL(url).pathname;

  if (url.includes("renown.gg/admin")) {
    return { type: "admin" };
  }

  for (const { pattern, handler } of ROUTE_MATCHERS) {
    if (typeof pattern === "string") {
      if (url.includes(pattern)) {
        return handler(null);
      }
    } else {
      const matches = path.match(pattern);
      if (matches) {
        return handler(matches);
      }
    }
  }
  return { type: "unknown" };
}

export function isLiveMatch(): boolean {
  const url = window.location.href;
  const isFileUrl =
    config.debug.enableFileUrlSupport && url.startsWith("file://");
  return getCurrentPage().type === "playMatch" || isFileUrl;
}

export function isMatchPage(): boolean {
  return getCurrentPage().type === "matchPage";
}

export function is404Page(): boolean {
  const notFoundPage = document.querySelector(".page.not-found");
  const is404 = notFoundPage !== null;
  return is404;
}
