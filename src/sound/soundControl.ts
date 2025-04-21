import type { UserSettings } from "../lib/types";

let userSettings: UserSettings | null = null;

// Store the original Audio constructor
const originalAudio = window.Audio;

// Track if we've had user interaction
let hadUserInteraction = false;

// Create an AudioContext instance to manage
const audioContext = new (window.AudioContext ||
  (window as any).webkitAudioContext)();

// Base64 encoded WAV - similar to what the original site uses
// This is a more noticeable notification sound
const NOTIFICATION_SOUND =
  "data:audio/wav;base64,UklGRgYPAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YeEOAACBgYCCgIKAgoGCgoKCgYKBgoGCgYKBgYKBgoGDgYOBgoKCg4KDgYKBg4KEg4SFhYaGiIaGg4SBgYB+fn1+fX9+f39/gICCgYODhISEhYSGhoeHiIiHiYeJh4iIh4eFhYOEg4ODgYOChIKDg4ODgYKChIGBgYKEg4WEhoeKjY6Pi4mFhYKAfnx9e318fn5/f4CCgYOCg4KCg4OFhIaGioqNjYyMiouJiYaEgH9/f398fXt+foGCgYGBhISFgoGAg4OEh4mMjJKVmZWSjImGgX98fHt9fH17fX1+f3+BgIKBg4OFhIaHiYuLjIuMiouIiIaEg4CAfX18fX1/gICBf4GBhIWDgX5/gIOFiY+Sl5mdmpWOiIR+fHh5eXp7enp4eHd4eHh7fICAhIWHiImMjI6Njo+PjoqKh4eDg4F+fXt9fYB/fn19f3+AfoCBhYmKjY+VmJybmJKLhoB9eHZ0dHNzdXd6eHl5fHx+gYSJiY2Nj4yNjY6OjY6MioWHhYJ9e3p4ent/fXt4eHd0cnR7gYiLk5ecnp6ck4uDgHx9fHx5eXh1dHN2dnl6foCCg4SIio+SlpaWlZKPiYeEhIOBgYCAfoCAfnp3dnNybnB0e4KHkJWamZyclo6Gg39+fHx8e3t5end2dHV4eHp8gYKHjI6Oi4yIhYKFiIeIiYqEgXt7eXl7f4WFhYJ+eHR2eoSKlJmenJSLg398f399eXp6eXt8f36AgIKCgoCDiIqLi4+QkIyKh4B8fIOBfn1/eHBvdnyBj5yahHl3cGJtkKill5GIgXx7dXBsbnF4goaFfXt4dXaDlaGln5iJfXV1fYqWlpaMemVeaHOFmqqeg25kWlJrmLWqlo6KhX15dXV3eX5+fnp4d3uFjpWUlI+Gfn2FiIuOkox8cnR7eoOXpJR3aGReVmuTqJ6LhoB8enx6en1/gX19e31+goaMj4mEf4OCgIGIjYaBgoeAfIWYmod3dHVscYmkpJaMiYZ/fHZ2d3p7e3x9fHuBiIyHhIJ/e3qAhYuJiIqQiH58iZGHeXFwZWBxlaiilo+Jf3t4enp9fH1+fH2Ah4mIhYJ+dXF0gYaHhoiJgHt/jI2Df4KBdXmOoZ2QiYR/eHl6d3Z4fHp8fYCBgoJ9enV3fIqTjoiJjomGh4d9bWtzenN6kaCYiYeBeXZ6d3FydHp/iIqHfHZ7gIOGj46Gf4SKh397gIB+fICChpGgqJZ8bHJ4fYWIgHR1eX+DhoOCfnRudYaMjZWdiXF2j5OHhX1sYnONpJ6MhoiEfYSCc2p3gYaHhH94bG6SraeRinhjbYyUgXdwX01imsO/q6KLaVJef5umlW9PWHSMp7qxim9aR1yizK+HZjAda9XquYprWGR4foB+gnldTFx6otPGfDgpSJfr4JFOJSuG7OCOb3+Ef3RmbImadkxKY5jZz3MuKFiz8sNvRSxPtemtfI2dj3NdYYurkFI8XaThwWIjNnzU5aBbLjSD2cmMjKObelVOfbOoWipEl9vIaiM0gdTipFUnO5ncuo6VppZsSWKjwYYzLnvQ1YgwKG/H565ZHTKX4LuIkamZXjZXrsR0ITCN0sVoIjSL3NqKNBhZyNyYf5yrfT03h82jRCZrxNGEKiZ31eCRMhZdzt2NdqK7hjAmeNSuRiBiv9WGLC2A3NyAKCOA3sZ6hbqwXR5Fr9l6JDKM0bZXKly75KRDHl/J04+Ft65ZIFG93HshMI/fyGIkT7frt04XS8PepZmwgzQuht2mORdhxdR+KTaU5MZaDiyj7rSMmHs/SaTShR8cctLOdSQukubPXAgcm/fDi5F5SGi4rkAEPbDlmSwQX93sgA4EZerukn1zW363lCsOXM/ZcBIeie7cYQUUhPXafWl+jqyWRRpRut2SLCF22+uNIRFn3PmhXXmtwJdMKFqtzJNAL3bP35w3GFq756Vqld7Ebx0ifMCyfkdCg8HKkD0pW7LcvKrDsWQiLofEolcsPYnNzY4yEkWp9eCmjXtgZXpzUERUfKSvmWxFR3OrzbOOgXtwa2tnZ2ZmYGJug5aZkYqJg4B+fXt7fn6Af4KEhoiIi4qJhoiHhoaDhYOFhIODhIaFiIeJioyMiIiHiIaGh4eIh4mGh4eIiIeIhYWEh4aGhoWFhIWCgoKAf31+fX9/gIB/f36BgYOAgH99fHl5d3l5enl3dnV3dnZycW5tbW1ucHRzc3Jzc3R1dXZ3enl7e4CAgIGBgoGDgoSAgICBgoKDg4WEhoOEhIaFhISDhYWIiImIioqLjY2OjI2LjIyOjY+Pj4+NjouMiYiGhYSChISFgoOCgoODhIKEgoOAfn9+f3t6eHd1c3RxcG9yc3BwbWxpamxvcnJ1dHZ0dXh5e3h3dHV1dXZ1d3d5eXp5e4CBg4CBgYGBgoOChYWIiYiIiIuKi4qMjIyMjJGSlJOWlpaWlZaUlZGPi4qLj5GQj4yOjY+Ojo6Mi4eFg4SBgH18e3l3dnl5eHRzcW9ubW5tbWxwcHJydHV0c25ta2xqa2xwcG5vcXNydXd7e3t5eXt7e3p9fX5/goWIiomLjI6Oj5COj46Sk5WUlpucnZyfnJeVl5uanJqbmJaWmJuWk46NjIqKiYmFhIGAgH5+e3t3dnVzcW1wc3Vxb25vcG1saGhnaWllZWRkXl1ibHNyb21zdXRvb3BxcW9xdH2AgHx+hoyNh4iKj42PlJukpJ2Ul5yhnZyfpKCUkp+2vLWlmpabnpiQjIyDfoSVl4x8cneBjIyEd3h8enJ0enRfTmB4dFxWW11WUFlyiYFnUFp0dE08Wm5gWXuSfVJKbJmxoYFpeJWGYnOkpXp2rM+mbHOr1NrFmoClxo1clOHEa3TGyXBTk8jCs6J5eKaWS0inwGM+hbdtNGOplHuDYjVejkAQbbtYC1WrWAlNpHlYg2EdS5xjJoLEaR6EvmIslMKGcq6CUY3JelbA4m1b2NFOdvrXlLK9bnnHrViT4ppYqdhuX9nLjY2fbmWTh01ppGo1bo0yOKCYUWB0QDdoWyNSi0EaXnEnS6OJSWl3UlZ9cF6On21wqZBrpNiifqKjg5e3mJXSwIaix4qK4OClqL6lkq2qip6sfoCffGufqXtvf3ZVYHlVWHxZNFtWK12WZzVDWTo0X1lBb25AXXRTca6VY3KMfHKamHmftHiMuIWT5tyTmbaqmsDJpsTUn6LAkJnUvpaRmpCGjI52hYpfYXNMW5yBTUheUkBQSjNYXyM0UDhXlnI2TGhhY3hrbpCGbYWCebDNlnSZoJ21tJq91aiqu5eu9dmhrLSktK6Qn6qMiZJxc6KOcGxgYXdfSmxbLkVUGyZ5czEySUI7UmFQR2FoWmqOkW5sfoWHjp2nppWNnL/b2si6wcrMyMXGwrejmJ2usKSWioeDf3d1d3NjSEBUb2lNNC01ODo8RUY8MDRMZXBkW19pbnR7goiFhIynwsq5rbO7xMrR0cy9trzIyLmroqCal5GNhnhranqCeF5NSEhFRUc/MCIsQ1hRPjlET1ZeY2ViZnCElZeMi5agrLO1s7bB0+fq28W9u726s6qfmZOXmJF/cG9wb2RbT0I6SWNaNSArODo6PD49RllvcGFlc35+g4uQkp6+0sayvM3R09bUw7vCy7+qoZ+elpSLeGRqhoNqV1lUTUU0GxQ2Yl8zIzA/TFZYUF15kINudoyir7Ghn73q7czA1+TYyLCjq8C6pZiWlIh6YFVvj3xTOTxALR8iLTpFNzE6R1JVVlpgcpKNfZanmJqssNj/+NDP0cm9rLjYx6OXnJR6boijhFBJXzwUKmlvIQAtNx8zWnNVPl1pXm6TsJh8pbSmwPb/07/YzrXC1MmtpKSOho6Ug2xpW0pNYVw2Jys1P1JaRThDVWR8iHVkeJOnyN2/mK3M0NrixaCmtKysr5Z4e4J7gn5RMTpARl1JEhQwPVRoSTFOYnOTm21unLPQ6sOMrtfX49ahkrGwrrKSbHeCgIpoKBxCXXVODxA6WXhsODpdgq6zdFV7uvj/zo5/q/D82a6MgKTIuZp8W0djgG5JKxgVL0RIRURESFdkcnyJkI6WrMzc39rRycbLyMCzq6OZkoh9bWBRQzkvKigtLzM8QkhPXWZzf4qVpLXCztDNztLPxcG5sqmimI2DdGVURzguJyMkJy40PkVPWWRxf46aqbnK1NrY087IxL22q6SbkoZ2YU09LyghHh4lLTZAR1JcaneKmau8y9fe4NrWzsi/uK6lmYx+bFlCLyAcGR0jKzQ+SVJfaXqNobLF1d/k4d3TzMW+tKiaiHhoWD8sIBobISowOkVRXmt6iJ6zxdLc4N3d1s7Du7GilYRzYU0wHRscJC0zOUdSV2V8lKS0vsbe8+7WycC9vrKZfWpeXkUaDBYlNkA7Q1Fge5GTmrXP7vPd0s7KxLigkYR5bUolGR8sNi8yQVBmb3F+mLvd18vS2t7Pu62mnpFuTT05OCYaIzZGUVBbco+orrjP5Ondy8XAtqaMd2ZXPiIVHiw6PkFPY36OlqrO6ezb0c/LwKaRhHxiNRkZJSssMUJWZ3J+ncHf4t3b19LBsJ6Rf104Ih8lJyYyQ1dncoqqzt/d3tvVxrall4VpRCgeHyYoMUFSaHSJqs7j49zY0sS0n453WzweFh0sNDtJYn+WqMLf5+LQu6OOhn93cW9qaGZlZWRnZmlpbW5xcnR3eHt7fn6BgIKDhIWFh4aIh4mIiIiIh4aHhYaDhIOEg4ODg4SCg4KCgIKAgH9/fn19e3x6e3p8e3x8fH19fnx9fH18fHx6e3p7ent7e3x8fnx+fX5+fn99f31+fn6AfoB/gYCAgH+AfoB/gIB/gH+BgIKCg4SDhIKDgYKCgoKBgoCCgYKCgoOCg4KDgoODgoOBgoGCgYKCgYKAgYCBgIGBgIGAgYCBgIGBgYGAgX+Bf4CAgYGAgX+AfoB+gH+AgICAf4B/gH+BgICAf4F/gH5/fn9/f4B/gH+AfoB+gH+AgH+AfoB+gH+BgIGAgIB/gYCCgIGAgYGAgYCBgIKAgYGBgYCBgIKBgYGAgoCCgIGBgYKBgoCBgIGBgIKAgoCBgIGBgIGAgYCBgQA=";

/**
 * Play notification sound with base64 encoded audio
 */
function playNotificationSound(volume: number) {
  if (!hadUserInteraction) {
    console.log("No user interaction yet, can't play sound");

    // Set up a one-time event listener for user interaction
    const handleUserInteraction = () => {
      hadUserInteraction = true;
      // Resume the AudioContext
      if (audioContext.state === "suspended") {
        audioContext
          .resume()
          .then(() => {
            console.log("AudioContext resumed successfully");
          })
          .catch((err) => {
            console.error("Failed to resume AudioContext:", err);
          });
      }
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      console.log("User interaction detected, future sounds will play");
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);
    return;
  }

  try {
    // Ensure AudioContext is running
    if (audioContext.state !== "running") {
      audioContext.resume().catch((err) => {
        console.error("Failed to resume AudioContext:", err);
      });
    }

    // Create audio element with embedded base64 WAV data
    const audio = new originalAudio(NOTIFICATION_SOUND);

    // Set volume from user settings
    audio.volume = volume / 100;

    // Play the sound immediately
    console.log(`Playing notification sound at volume ${audio.volume}`);
    audio.play().catch((error) => {
      console.error("Error playing embedded sound:", error);
    });
  } catch (error) {
    console.error("Error creating audio element:", error);
  }
}

/**
 * Intercepts the Audio constructor to prevent default sounds
 */
function setupAudioInterception() {
  // Override the Audio constructor
  // @ts-ignore - We're intentionally modifying a global constructor
  window.Audio = function (...args: any[]) {
    // Create the original audio element
    const audioElement = new originalAudio(...args);

    // Set volume to 0 to mute all sounds by default
    const originalVolume = audioElement.volume;
    audioElement.volume = 0;

    // Store the source if it was provided in constructor
    const initialSource = args.length > 0 ? args[0] : null;

    // Override the src property
    let originalSrc = initialSource;
    Object.defineProperty(audioElement, "src", {
      get: function () {
        return originalSrc;
      },
      set: function (newSrc) {
        console.log("Audio src intercepted:", newSrc);
        originalSrc = newSrc;
      },
    });

    // Add a hook to the play method
    const originalPlay = audioElement.play;
    audioElement.play = function () {
      // Check for party invite toast when any sound tries to play
      const partyInviteElement =
        document.querySelector(".toast-party-invite") ||
        document.querySelector("#clutch-ext-invite-toast");

      if (partyInviteElement && userSettings?.sounds.partyInvite.enabled) {
        console.log(
          "Intercepted audio playback during party invite, playing our sound instead"
        );
        playNotificationSound(userSettings.sounds.partyInvite.volume);
        return Promise.resolve(); // Block original sound by returning resolved promise
      }

      // Check for match found modal
      const matchFoundElement = findMatchFoundModal();

      if (matchFoundElement && userSettings?.sounds.matchFound.enabled) {
        console.log(
          "Intercepted audio playback during match found, playing our sound instead"
        );
        playNotificationSound(userSettings.sounds.matchFound.volume);
        return Promise.resolve(); // Block original sound by returning resolved promise
      }

      // If we didn't detect something specific, check if this is a notification sound
      // Many sites use common patterns for notification sounds
      if (originalSrc && typeof originalSrc === "string") {
        const isLikelyNotification =
          originalSrc.includes("notification") ||
          originalSrc.includes("alert") ||
          originalSrc.includes("sound") ||
          originalSrc.includes("ping");

        if (isLikelyNotification && userSettings?.sounds.matchFound.enabled) {
          console.log(
            "Likely notification sound detected, using our sound instead"
          );
          playNotificationSound(userSettings.sounds.matchFound.volume);
          return Promise.resolve();
        }
      }

      // For any sounds we're not replacing, allow playback at normal volume
      audioElement.volume = originalVolume;
      return originalPlay.call(this);
    };

    // Also intercept the load method to ensure src changes are captured
    const originalLoad = audioElement.load;
    audioElement.load = function () {
      // If the audio was already going to be intercepted, we need to block load too
      const matchFoundElement = findMatchFoundModal();
      const partyInviteElement =
        document.querySelector(".toast-party-invite") ||
        document.querySelector("#clutch-ext-invite-toast");

      if (
        (matchFoundElement && userSettings?.sounds.matchFound.enabled) ||
        (partyInviteElement && userSettings?.sounds.partyInvite.enabled)
      ) {
        console.log("Blocked audio load during intercepted event");
        return; // Block load
      }

      return originalLoad.call(this);
    };

    return audioElement;
  };

  // Copy over prototype and properties
  window.Audio.prototype = originalAudio.prototype;
  Object.setPrototypeOf(window.Audio, originalAudio);

  console.log("Audio interception set up");
}

/**
 * Sets up observers to detect notifications
 */
function setupSoundDetection() {
  console.log("Sound detection initialized");

  // Set up user interaction detection
  document.addEventListener(
    "click",
    () => {
      hadUserInteraction = true;
      // Attempt to resume AudioContext on first interaction
      if (audioContext.state === "suspended") {
        audioContext
          .resume()
          .then(() => {
            console.log("AudioContext resumed successfully on user click");
          })
          .catch((err) => {
            console.error("Failed to resume AudioContext:", err);
          });
      }
      console.log("User interaction detected, sounds enabled");
    },
    { once: true }
  );

  // Also try to resume on various other user events
  const userEvents = ["touchstart", "keydown", "pointerdown"];
  userEvents.forEach((eventType) => {
    document.addEventListener(
      eventType,
      () => {
        if (!hadUserInteraction && audioContext.state === "suspended") {
          hadUserInteraction = true;
          audioContext.resume().catch((err) => {
            console.log("Could not resume AudioContext on", eventType, err);
          });
        }
      },
      { once: true }
    );
  });

  // Create a mutation observer to watch for DOM changes
  const observer = new MutationObserver((mutations) => {
    // Check for party invite
    const partyInviteElement =
      document.querySelector(".toast-party-invite") ||
      document.querySelector("#clutch-ext-invite-toast");

    if (partyInviteElement && userSettings?.sounds.partyInvite.enabled) {
      console.log("Party invite detected directly, playing sound");
      playNotificationSound(userSettings.sounds.partyInvite.volume);
    }

    // Check for match found
    const matchFoundElement = findMatchFoundModal();

    if (matchFoundElement && userSettings?.sounds.matchFound.enabled) {
      console.log("Match found detected directly, playing sound");
      playNotificationSound(userSettings.sounds.matchFound.volume);
    }
  });

  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Check for elements that might already exist when initializing
  checkExistingElements();
}

/**
 * Finds the match found modal
 */
function findMatchFoundModal(): Element | null {
  return (
    document.querySelector(".confirm-match-modal") ||
    document.querySelector("[data-testid='match-found-modal']") ||
    document.querySelector(".match-found-container") ||
    document.querySelector("[class*='matchFound']")
  );
}

/**
 * Checks for elements that are already present in the DOM
 */
function checkExistingElements() {
  console.log("Checking for existing elements");

  // Check for party invite
  const partyInviteElement =
    document.querySelector(".toast-party-invite") ||
    document.querySelector("#clutch-ext-invite-toast");

  if (partyInviteElement && userSettings?.sounds.partyInvite.enabled) {
    console.log("Existing party invite found, playing sound");
    playNotificationSound(userSettings.sounds.partyInvite.volume);
  }

  // Check for match found
  const matchFoundElement = findMatchFoundModal();

  if (matchFoundElement && userSettings?.sounds.matchFound.enabled) {
    console.log("Existing match found modal detected, playing sound");
    playNotificationSound(userSettings.sounds.matchFound.volume);
  }
}

export function initialize(settings: UserSettings) {
  console.log("Sound control initialized with settings:", settings);
  userSettings = settings;
  setupAudioInterception(); // Set up interception first to block default sounds
  setupSoundDetection();
}

export function updateSettings(settings: UserSettings) {
  console.log("Sound settings updated:", settings);
  userSettings = settings;
}
