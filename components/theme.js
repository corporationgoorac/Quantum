const theme = {
  backgroundColor: '#121212', // Instagram-style premium dark gray
  bgTransparent: 'rgba(18, 18, 18, 0.85)', // For the blurry floating headers
  surfaceColor: '#262626',    // Lighter gray for navbars, inputs, and cards
  textColor: '#FAFAFA',       // Soft white
  textDim: '#A8A8A8',         // Muted gray
  accentColor: '#0095F6',     // Instagram's vibrant blue
  mobileToolbarColor: '#121212',
  borderColor: '#333333'      // Retained, but overridden in CSS where borders are removed
};

// =========================================================
// 1. THE MASTER CSS BLOCK (Used for both Global and Shadow DOM)
// =========================================================
const masterCSS = `
    /* HIDE SCROLLBARS GLOBALLY */
    ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    * { -ms-overflow-style: none !important; scrollbar-width: none !important; }

    /* BASE THEME */
    :host, html, body {
      background-color: ${theme.backgroundColor} !important;
      color: ${theme.textColor} !important;
    }

    /* OBLITERATE PURE BLACK ACROSS ALL WRAPPERS */
    .app-container, .main-content, .bite-slide, .yt-player-container, 
    #discover-modal, .grid-results, #bites-viewport, main-navbar, .chat-item, 
    .notes-container, .chat-list-container, .search-wrapper, .messages-container, 
    .messages-wrapper, .chat-list, .notes-wrapper, .notes-area, .note-section, 
    .page-container, #app, main, .modal, .side-modal, .fullscreen-modal, 
    .modal-overlay, #group-modal, #add-members-modal, #edit-modal, .notes-scroll, 
    .notes-list, .story-tray, .stories-wrapper, .horizontal-scroll, .chats-body,
    .moment-wrapper, .moment-fullscreen, .moment-container, .viewer-container {
      background-color: ${theme.backgroundColor} !important;
      background: ${theme.backgroundColor} !important;
    }

    /* HEADERS & MODAL TOPS */
    header, .header, #header, .top-header, .modal-header, .modal-header-top, 
    .chats-header, .notes-header, .moment-header, .view-header, .inbox-controls {
      background-color: ${theme.bgTransparent} !important;
      background: ${theme.bgTransparent} !important;
      border: none !important;
      box-shadow: none !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
    }

    /* SURFACE COLORS (Cards, Inputs, Modals) */
    .call-card, .creator-card, .search-input-box, .search-container input, 
    .search-input, .grid-item, .creator-pfp, .skel-shimmer, .note-bubble, 
    .note-card, .action-button, .add-note-btn, .modal-card, .modal-content, 
    .modal-body, .group-modal, #action-menu, .action-menu, .bottom-sheet, 
    .sheet, .menu-content, .menu-item, .action-item, .dropdown-menu, 
    .dropdown-content, .popup, .dialog, .bottom-modal-intro, .moment-card, 
    .comment-section, .comment-input-area, .reply-input-container {
      background-color: ${theme.surfaceColor} !important;
      border: none !important;
      box-shadow: none !important;
    }

    /* FIXES FOR PATCHES AND TAILS */
    .note-item, .story-item { background: transparent !important; border: none !important; }
    .note-pfp, .story-avatar, .moment-pfp { border-color: ${theme.backgroundColor} !important; }
    .note-bubble::after, #my-note-preview::after { background-color: inherit !important; background: inherit !important; border: none !important; }

    /* ACCENTS & BUTTONS */
    .follow-badge, .start-btn-pulse, .action-btn.follow, .primary-btn, .moment-btn,
    button[id*="submit"], button[id*="create"], #bite-progress-bar, .moment-progress-bar-fill {
      background-color: ${theme.accentColor} !important;
      color: #fff !important;
    }

    /* TEXT COLORS */
    .chat-preview, .call-time, .call-type, .creator-stats, .time, .date, .note-text, 
    .moment-time, .comment-text, p, .subtitle { color: ${theme.textDim} !important; }
    .chat-name, .caller-name, .creator-name, .moment-author, .viewer-name, h1, h2, h3, h4, .title { color: ${theme.textColor} !important; }
    
    .action-btn:not(.liked) .material-icons-round, .moment-action:not(.active) .material-icons-round {
      color: ${theme.textColor} !important;
    }
`;

// =========================================================
// 2. THE INJECTION ENGINE
// =========================================================
const injectStyles = () => {
  // Force Variables on document root
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--bg', theme.backgroundColor, 'important');
  rootStyle.setProperty('--surface', theme.surfaceColor, 'important');
  rootStyle.setProperty('--text-main', theme.textColor, 'important');
  rootStyle.setProperty('--text', theme.textColor, 'important');
  rootStyle.setProperty('--text-dim', theme.textDim, 'important');
  rootStyle.setProperty('--dim', theme.textDim, 'important');
  rootStyle.setProperty('--accent', theme.accentColor, 'important');
  rootStyle.setProperty('--border-color', theme.borderColor, 'important');
  rootStyle.setProperty('--border', theme.borderColor, 'important');

  // Inject into Global Head
  if (!document.getElementById('quantum-global-colors')) {
    const style = document.createElement('style');
    style.id = 'quantum-global-colors';
    style.textContent = masterCSS;
    document.head.appendChild(style);
  }

  // AGGRESSIVE SHADOW DOM PENETRATION
  // This finds every single element with a Shadow Root and slaps the theme inside
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    if (el.shadowRoot && !el.shadowRoot.getElementById('quantum-shadow-theme')) {
      const shadowStyle = document.createElement('style');
      shadowStyle.id = 'quantum-shadow-theme';
      shadowStyle.textContent = masterCSS;
      el.shadowRoot.appendChild(shadowStyle);
    }
  });
};

const injectMobileToolbarColor = () => {
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = theme.mobileToolbarColor;
};

// =========================================================
// 3. THE BRAIN: MUTATION OBSERVER (The "Bulldozer")
// =========================================================
const startBulldozer = () => {
  injectStyles();
  
  // Watch for any new elements, including moments, modals, or shadow-dom components
  const observer = new MutationObserver((mutations) => {
    let shouldRedo = false;
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) shouldRedo = true;
    });
    if (shouldRedo) injectStyles();
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

// Execute immediately upon import
startBulldozer();
injectMobileToolbarColor();
