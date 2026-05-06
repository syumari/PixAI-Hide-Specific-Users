// ==UserScript==
// @name         PixAI Hide Specific Users
// @namespace    https://github.com/syumari/PixAI-Hide-Specific-Users
// @version      1.0.0
// @description  Hide artworks from specific users on PixAI. Supports blocking by username (@user) which automatically resolves to their current display name.
// @author       syumari
// @match        https://pixai.art/*
// @run-at       document-idle
// @grant        none
// @license      MIT
// ==/UserScript==

(async () => {
  // --- Configuration ---
  // Block by display name ("nickname") or by username ("@username").
  // If you use "@username", the script will automatically fetch their current display name.
  const blockedUsers = [
    "対象ユーザー表示名",
    "@target_user_id"
  ];
  // ---------------------

  const resolvedBlockedNames = new Set();
  const usernameCache = new Map(); // Cache to avoid duplicate API calls

  // Resolve @username to display name via PixAI GraphQL API
  async function resolveUsernameToDisplayName(username) {
    // Remove '@' if present
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    
    if (usernameCache.has(cleanUsername)) {
      return usernameCache.get(cleanUsername);
    }

    const query = `
      query getUserInfoByUsername($username: String!) {
        user(username: $username) {
          id
          displayName
          username
        }
      }
    `;

    try {
      const response = await fetch("https://api.pixai.art/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { username: cleanUsername } })
      });
      
      const data = await response.json();
      if (data?.data?.user?.displayName) {
        const displayName = data.data.user.displayName;
        usernameCache.set(cleanUsername, displayName);
        return displayName;
      }
    } catch (error) {
      console.error(`[PixAI Hide Specific Users] Failed to resolve username: ${username}`, error);
    }
    return null;
  }

  // Initialize the blocklist by resolving all @usernames
  async function initBlocklist() {
    for (const user of blockedUsers) {
      if (user.startsWith('@')) {
        const displayName = await resolveUsernameToDisplayName(user);
        if (displayName) {
          resolvedBlockedNames.add(displayName);
          console.log(`[PixAI Hide Specific Users] Resolved ${user} -> ${displayName}`);
        }
      } else {
        resolvedBlockedNames.add(user);
      }
    }
    // Run hide function once initialization is complete
    hideBlockedCards();
  }

  function isBlocked(text) {
    if (!text) return false;
    for (const name of resolvedBlockedNames) {
      if (text.includes(name)) return true;
    }
    return false;
  }

  function hideBlockedCards() {
    // We don't have resolved names yet
    if (resolvedBlockedNames.size === 0) return;

    // Check all links
    const links = document.querySelectorAll("a[href]");

    links.forEach(link => {
      const text = link.innerText || link.textContent || "";
      const href = link.getAttribute("href") || "";

      // We only care if the link text contains a blocked display name
      if (!isBlocked(text)) return;

      // Find the card container
      let card = link;

      for (let i = 0; i < 5; i++) {
        if (!card.parentElement) break;

        const parent = card.parentElement;
        const rect = parent.getBoundingClientRect();

        // Safety check to avoid hiding the whole page
        if (rect.width > window.innerWidth * 0.9) break;
        if (rect.height > window.innerHeight * 0.9) break;

        card = parent;
      }

      if (card.style.display !== "none") {
        card.style.display = "none";
        // console.log(`[PixAI Hide Specific Users] Hid card for blocked user`);
      }
    });
  }

  // Start initialization
  initBlocklist();

  // Observe DOM changes to hide new cards as they load
  const observer = new MutationObserver(() => {
    hideBlockedCards();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Handle SPA navigation
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(hideBlockedCards, 500);
      setTimeout(hideBlockedCards, 1500);
    }
  }, 700);
})();
