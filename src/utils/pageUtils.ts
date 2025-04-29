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

export function getCurrentPage(): PageType {
  const url = window.location.href;
  const path = new URL(url).pathname;

  if (url.includes("renown.gg/admin")) {
    return { type: "admin" };
  }

  if (path === "/") {
    return { type: "home" };
  }

  if (path === "/play") {
    return { type: "play" };
  }

  if (path.startsWith("/play/match")) {
    return { type: "playMatch" };
  }

  if (path === "/banlist") {
    return { type: "banlist" };
  }

  if (path === "/drops") {
    return { type: "drops" };
  }

  if (path.startsWith("/feedback")) {
    return { type: "feedback" };
  }

  if (path.startsWith("/profile/settings")) {
    return { type: "profileSettings" };
  }

  const profileMatch = path.match(/^\/profile\/(\d+)$/);
  if (profileMatch) {
    return { type: "profile", id: profileMatch[1] };
  }

  const matchMatch = path.match(/^\/match\/(\d+)$/);
  if (matchMatch) {
    return { type: "matchPage", id: matchMatch[1] };
  }

  return { type: "unknown" };
}
