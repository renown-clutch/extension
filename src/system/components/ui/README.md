# Clutch Extension - Shared Animation System

## Overview

The Clutch extension now uses a unified animation system to ensure consistent entrance animations across all features. This eliminates CSS duplication and provides a clean, maintainable approach to animations.

## Quick Start

### 1. Using CSS Classes Directly

Simply add the appropriate animation class to your element:

```typescript
const element = document.createElement("div");
element.className = "my-element clutch-animate-fade-in-slide";
```

### 2. Using Animation Utils (Recommended)

```typescript
import { applyAnimation, AnimationPresets } from "$utils/ui/animationUtils";

// Method 1: Apply animation function
const element = document.createElement("div");
applyAnimation(element, "fade-in-slide", "normal", "short");

// Method 2: Use presets
const badge = document.createElement("div");
applyPresetAnimation(badge, "faceitBadge");

// Method 3: Create animated element
const button = createAnimatedElement("button", "fade-in-scale", {
  className: "my-button",
  timing: "fast",
  attributes: { "data-feature": "navigation" },
});
```

## Available Animations

### Base Animation Types

| Animation Type          | Effect                                | Use Case            |
| ----------------------- | ------------------------------------- | ------------------- |
| `fade-in`               | Simple fade                           | Basic elements      |
| `fade-in-slide`         | Slide from left + fade                | Containers, panels  |
| `fade-in-slide-delayed` | Slide from left + fade (delayed)      | Navigation elements |
| `fade-in-down`          | Slide from top + fade                 | Headers, titles     |
| `fade-in-up`            | Slide from bottom + fade              | Badges, tooltips    |
| `fade-in-scale`         | Scale up + fade                       | Buttons, badges     |
| `fade-in-scale-delayed` | Scale up + fade (delayed)             | Secondary elements  |
| `chat-icon`             | Special scale for chat minimized icon | Chat feature only   |

### Animation Timing

- `fast` - 0.2s duration
- `normal` - Default timing (varies by animation)
- `slow` - 0.5s duration

### Animation Delays

- `none` - No delay
- `short` - 0.1s delay
- `medium` - 0.2s delay
- `long` - 0.3s delay

## Feature-Specific Presets

Use these presets for consistency with existing features:

```typescript
// Main page features
applyPresetAnimation(partyEloElement, "partyEloDisplay");
applyPresetAnimation(faceitBadge, "faceitBadge");
applyPresetAnimation(averageBadge, "averageBadge");
applyPresetAnimation(matchHistory, "lastMatches");

// Sidebar features
applyPresetAnimation(friendRank, "friendRank");

// Navigation
applyPresetAnimation(navButton, "navbarButton");

// Chat
applyPresetAnimation(chatIcon, "minimizedIcon");
```

## Migration from Old System

### Before (Old CSS per feature)

```css
.my-element {
  opacity: 0;
  transform: translateX(-10px);
  animation: my-custom-fade-in 0.3s ease-out forwards;
}

@keyframes my-custom-fade-in {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### After (Shared system)

```css
.my-element {
  /* No animation CSS needed */
}
```

```typescript
// In JavaScript/TypeScript
element.classList.add("clutch-animate-fade-in-slide");
// or
applyPresetAnimation(element, "slideIn");
```

## Design Principles

1. **Consistency**: All visible extension elements should have entrance animations
2. **Performance**: Animations should be lightweight (0.2-0.4s max duration)
3. **UX**: Avoid jarring sudden appearances - smooth transitions enhance user experience
4. **Maintainability**: Use shared animations instead of duplicating CSS

## Implementation Notes

- The shared animations are automatically included in the build process
- All animations use `forwards` fill-mode to maintain final state
- Animations are designed to not interfere with existing site functionality
- Use `ease-out` easing for natural feeling animations

## Example: Adding Animation to New Feature

```typescript
// features/myFeature/myFeature.ts
import { applyAnimation } from "$utils/ui/animationUtils";

function createMyFeatureElement(): HTMLElement {
  const container = document.createElement("div");
  container.className = "my-feature-container";

  // Apply animation
  applyAnimation(container, "fade-in-slide", "normal", "short");

  return container;
}
```

## Testing

When testing animations:

1. Enable/disable features to verify animations trigger correctly
2. Test on different screen sizes
3. Verify animations don't interfere with site functionality
4. Check that cleanup handlers properly remove animated elements
