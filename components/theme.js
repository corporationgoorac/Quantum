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

const applyTheme = () => {
  // 1. Force variables natively via JS inline styles (Bulletproof against CSS overrides)
  const root = document.documentElement;
  root.style.setProperty('--bg', theme.backgroundColor, 'important');
  root.style.setProperty('--surface', theme.surfaceColor, 'important');
  root.style.setProperty('--text-main', theme.textColor, 'important');
  root.style.setProperty('--text-dim', theme.textDim, 'important');
  root.style.setProperty('--accent', theme.accentColor, 'important');
  root.style.setProperty('--border-color', theme.borderColor, 'important');
  root.style.setProperty('--bg-transparent', theme.bgTransparent, 'important');

  // 2. Inject aggressive CSS
  const style = document.createElement('style');
  style.id = 'quantum-global-colors';
  
  style.textContent = `
    /* =========================================================
       0. HIDE SCROLLBARS GLOBALLY
       ========================================================= */
    ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    * { -ms-overflow-style: none !important; scrollbar-width: none !important; }

    /* 1. DOM LEVEL OVERRIDES */
    html, body, #app, main, .app-container, .main-content, .page-container {
      background-color: var(--bg) !important;
      background: var(--bg) !important;
      color: var(--text-main) !important;
    }

    /* 2. SPECIFIC WRAPPERS & CONTAINERS THAT HIDE BLACK */
    .messages-container, .messages-wrapper, .chat-list, .chat-list-container,
    .notes-container, .notes-wrapper, .notes-area, .note-section, .notes-scroll, .notes-list,
    .search-wrapper, .story-tray, .stories-wrapper, .horizontal-scroll, .chats-body,
    .bite-slide, .yt-player-container, #discover-modal, .grid-results, #bites-viewport {
      background-color: var(--bg) !important;
      background: var(--bg) !important;
    }

    /* 3. MODALS, SHEETS, & OVERLAYS */
    .modal, .modal-overlay, #group-modal, #add-members-modal, #edit-modal,
    .modal-body {
      background-color: var(--bg) !important;
      background: var(--bg) !important;
    }

    /* 4. BLURRY HEADERS */
    header, .header, #header, .top-header, .modal-header, .chats-header {
      background-color: var(--bg-transparent) !important;
      background: var(--bg-transparent) !important;
      border: none !important;
      box-shadow: none !important;
      backdrop-filter: blur(15px) !important;
      -webkit-backdrop-filter: blur(15px) !important;
    }

    /* 5. SURFACE CARDS, MENUS, & INPUTS */
    .call-card, .creator-card, .search-input-box, .search-container input, .search-input,
    .grid-item, .creator-pfp, .skel-shimmer, .note-bubble, .note-card, .note-item,
    .modal-content, .group-modal, #action-menu, .action-menu, .bottom-sheet, .sheet,
    .menu-content, .menu-item, .action-item, .dropdown-menu, .dropdown-content, .popup, .dialog,
    .add-note-btn, .modal-card, .chat-item {
      background-color: var(--surface) !important;
      background: var(--surface) !important;
      border: none !important;
      box-shadow: none !important;
    }

    /* Bottom Nav Fix */
    main-navbar {
      background-color: var(--bg) !important;
      background: var(--bg) !important;
      border: none !important;
      box-shadow: none !important;
    }

    /* 6. BUTTONS & ACCENTS */
    .follow-badge, .start-btn-pulse, .action-btn.follow, .primary-btn, 
    button[id*="submit"], button[id*="create"], .action-button, .btn {
      background-color: var(--accent) !important;
      color: #fff !important;
      border: none !important;
    }

    #bite-progress-bar { background-color: var(--accent) !important; box-shadow: 0 0 12px var(--accent) !important; }
    
    input:focus, textarea:focus, .search-input-box:focus, .search-container input:focus {
      border: 1px solid var(--accent) !important;
      box-shadow: 0 0 10px rgba(0, 149, 246, 0.2) !important;
      outline: none !important;
    }

    /* 7. TEXT COLORS */
    .chat-preview, .call-time, .call-type, .creator-stats, .time, .date, .note-text, p, .subtitle, .header-title span {
      color: var(--text-dim) !important;
    }

    .chat-name, .caller-name, .creator-name, h1, h2, h3, h4, .title, .header-title {
      color: var(--text-main) !important;
    }

    /* Keep the like button red when active, but match text colors */
    .action-btn:not(.liked) .material-icons-round {
      color: var(--text-main) !important;
    }
  `;
  
  // Appends to documentElement ONLY after DOM is parsed, making it the very last stylesheet
  const appendStyle = () => {
    if (!document.getElementById('quantum-global-colors')) {
      document.documentElement.appendChild(style);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendStyle);
  } else {
    appendStyle();
  }
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

// Execute immediately upon import
applyTheme();
injectMobileToolbarColor();
