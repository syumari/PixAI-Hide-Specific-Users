# PixAI Hide Specific Users

A [Tampermonkey](https://www.tampermonkey.net/) userscript that hides artworks from specific users on [PixAI](https://pixai.art/).

## Features

- Hide artwork cards from specific users on any PixAI page (home, explore, etc.)
- **Block by `@username`** — the script automatically resolves the current display name via the PixAI GraphQL API, so it keeps working even if the user changes their nickname
- Block by display name directly (as a fallback)
- Works with SPA navigation (no page reload required)

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Click the link below to install the script directly:

   **[Install from Greasy Fork](https://greasyfork.org/)**  
   *(or install manually from the raw file above)*

## Configuration

Edit the `blockedUsers` array near the top of the script:

```js
const blockedUsers = [
  "@target_user_id",      // Block by @username (recommended — survives nickname changes)
  "SomeDisplayName",      // Block by display name directly
];
```

To find a user's `@username`, visit their profile page on PixAI. The URL will be:
```
https://pixai.art/@USERNAME/artworks
```

## How it works

When the script loads, it checks each entry in `blockedUsers`:

- If an entry starts with `@`, it calls the PixAI GraphQL API (`user(username: ...)`) to resolve the current display name, and caches the result for the session.
- Display names (with or without `@`) are matched against the text content of links in artwork cards.
- Matched cards are hidden by setting `display: none` on the closest card container.
- A `MutationObserver` ensures newly loaded cards (infinite scroll, SPA navigation) are also hidden.

## License

MIT
