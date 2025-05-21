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

  console.log("[Clutch] getCurrentPage analyzing URL:", url, "path:", path);

  if (url.includes("renown.gg/admin")) {
    console.log("[Clutch] Detected admin page");
    return { type: "admin" };
  }

  if (path === "/") {
    console.log("[Clutch] Detected home page");
    return { type: "home" };
  }

  if (path === "/play") {
    console.log("[Clutch] Detected play page");
    return { type: "play" };
  }

  if (path.startsWith("/play/match")) {
    console.log("[Clutch] Detected play match page");
    return { type: "playMatch" };
  }

  if (path === "/banlist") {
    console.log("[Clutch] Detected banlist page");
    return { type: "banlist" };
  }

  if (path === "/drops") {
    console.log("[Clutch] Detected drops page");
    return { type: "drops" };
  }

  if (path.startsWith("/feedback")) {
    console.log("[Clutch] Detected feedback page");
    return { type: "feedback" };
  }

  if (path.startsWith("/profile/settings")) {
    console.log("[Clutch] Detected profile settings page");
    return { type: "profileSettings" };
  }

  const profileMatch = path.match(/^\/profile\/(\d+)$/);
  if (profileMatch) {
    console.log("[Clutch] Detected profile page for ID:", profileMatch[1]);
    return { type: "profile", id: profileMatch[1] };
  }

  const matchMatch = path.match(/^\/match\/(\d+)$/);
  if (matchMatch) {
    console.log("[Clutch] Detected match page for ID:", matchMatch[1]);
    return { type: "matchPage", id: matchMatch[1] };
  }

  console.log("[Clutch] Unknown page type");
  return { type: "unknown" };
}

export function isLiveMatch(): boolean {
  return (
    getCurrentPage().type === "playMatch" ||
    window.location.href.startsWith("file://")
  );
}

export function isMatchPage(): boolean {
  return getCurrentPage().type === "matchPage";
}

export function is404Page(): boolean {
  const notFoundPage = document.querySelector(".page.not-found");
  const is404 = notFoundPage !== null;
  console.log("[Clutch] is404Page check:", is404, "element:", notFoundPage);
  return is404;
}
