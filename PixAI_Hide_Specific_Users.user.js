// ==UserScript==
// @name         PixAI Hide Specific Users
// @name:ja      PixAI 特定ユーザー非表示
// @name:zh-CN   PixAI 隐藏特定用户
// @name:zh-TW   PixAI 隱藏特定使用者
// @name:ko      PixAI 특정 사용자 숨기기
// @namespace    https://github.com/syumari/PixAI-Hide-Specific-Users
// @version      1.0.0
// @description  Hide artworks from specific users on PixAI. Supports blocking by @username which automatically resolves to their current display name via GraphQL API.
// @description:ja PixAI 上の特定ユーザーの作品を非表示にします。@username でブロックすると GraphQL API で表示名を自動取得するため、ニックネーム変更後も機能し続けます。
// @description:zh-CN 隐藏 PixAI 上特定用户的作品。支持通过 @username 屏蔽，脚本会自动通过 GraphQL API 获取当前显示名，即使用户更改昵称也能持续生效。
// @description:zh-TW 隱藏 PixAI 上特定使用者的作品。支援透過 @username 封鎖，腳本會自動透過 GraphQL API 取得目前顯示名稱，即使使用者更改暱稱也能持續運作。
// @description:ko PixAI에서 특정 사용자의 작품을 숨깁니다. @username으로 차단하면 GraphQL API를 통해 현재 표시 이름을 자동으로 가져오므로 닉네임이 변경되어도 계속 작동합니다.
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
