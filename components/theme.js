/**
 * =========================================================
 * QUANTUM ENTERPRISE AI - GLOBAL THEME BULLDOZER 
 * =========================================================
 * VERSION: 4.0.0 (Ultra Immersive Edition)
 * * DESCRIPTION:
 * This script forcefully injects the Instagram-style dark 
 * theme into every corner of the application. It features:
 * 1. Root Variable Injection (Direct Property Overrides)
 * 2. Light DOM Style Cascading (Important Flag Enforcement)
 * 3. Shadow DOM Piercing (Pierces Web Component Enclaves)
 * 4. Mutation Monitoring (Real-time tracking of new elements)
 * 5. Mobile UI Optimization (Toolbar & Notch handling)
 * * DESIGNED BY: Quantum Dev Team
 * =========================================================
 */

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

/**
 * CORE LOGIC: ROOT VARIABLE INJECTION
 * Applies variables directly to the Document Object Model for 0ms reactivity.
 */
const applyRootVariables = () => {
  // --- FIX: Forcefully override variables directly on the HTML tag ---
  // This guarantees they win against any page-level :root definitions
  const rootStyle = document.documentElement.style;
  
  rootStyle.setProperty('--bg', theme.backgroundColor, 'important');
  rootStyle.setProperty('--surface', theme.surfaceColor, 'important');
  rootStyle.setProperty('--text-main', theme.textColor, 'important');
  rootStyle.setProperty('--text', theme.textColor, 'important'); // Catch 'messages.html' specific var
  rootStyle.setProperty('--text-dim', theme.textDim, 'important');
  rootStyle.setProperty('--dim', theme.textDim, 'important'); // Catch 'messages.html' specific var
  rootStyle.setProperty('--accent', theme.accentColor, 'important');
  rootStyle.setProperty('--border-color', theme.borderColor, 'important');
  rootStyle.setProperty('--border', theme.borderColor, 'important'); // Catch 'messages.html' specific var
  
  // Advanced browser support
  rootStyle.setProperty('--quantum-accent', theme.accentColor, 'important');
  rootStyle.setProperty('--quantum-bg', theme.backgroundColor, 'important');
};

/**
 * MASTER CSS BUILDER
 * Generates the raw CSS string used for both Light DOM and Shadow DOM injection.
 */
const getGlobalCSS = () => {
  return `
    /* =========================================================
       0. HIDE SCROLLBARS GLOBALLY
       ========================================================= */
    ::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
    * {
      -ms-overflow-style: none !important;  /* IE and Edge */
      scrollbar-width: none !important;     /* Firefox */
    }

    /* 1. Define the color palette globally */
    :root {
      --bg: ${theme.backgroundColor} !important;
      --bg-transparent: ${theme.bgTransparent} !important;
      --surface: ${theme.surfaceColor} !important;
      --text-main: ${theme.textColor} !important;
      --text-dim: ${theme.textDim} !important;
      --accent: ${theme.accentColor} !important;
      --border-color: ${theme.borderColor} !important;
    }

    /* 2. BASE BODY THEME */
    html, body {
      background-color: var(--bg) !important;
      color: var(--text-main) !important;
    }

    /* =========================================================
       3. OBLITERATE PURE BLACK (#000) ACROSS ALL PAGES
       ========================================================= */
    /* Targets the main wrappers, video feeds, navigation, and message sections */
    .app-container,
    .main-content,
    .bite-slide, 
    .yt-player-container, 
    #discover-modal, 
    .grid-results, 
    #bites-viewport,
    main-navbar,
    .chat-item,
    .notes-container,
    .chat-list-container,
    .search-wrapper,
    /* Expanded targets for messages to guarantee no black */
    .messages-container,
    .messages-wrapper,
    .chat-list,
    .notes-wrapper,
    .notes-area,
    .note-section,
    .page-container,
    #app,
    main,
    /* Force Modals & Overlays to use the theme background */
    .modal,
    .side-modal,
    .fullscreen-modal,
    .modal-overlay,
    #group-modal,
    #add-members-modal,
    #edit-modal,
    /* NEW: Aggressively target Note Scroll areas */
    .notes-scroll,
    .notes-list,
    .story-tray,
    .stories-wrapper,
    .horizontal-scroll,
    .chats-body,
    /* SHADOW DOM TARGETS: Moments and Viewers */
    .moment-wrapper,
    .moment-fullscreen,
    .moment-container,
    .viewer-container,
    .story-viewer {
      background-color: var(--bg) !important;
      background: var(--bg) !important; /* Overrides any gradients */
    }

    /* Top Headers - Give them the transparent blur effect with new dark gray AND REMOVE BORDERS */
    header, 
    .header, 
    #header,
    .top-header,
    .modal-header,
    .modal-header-top,
    .chats-header,
    .notes-header,
    .moment-header,
    .view-header,
    .inbox-controls {
      background-color: var(--bg-transparent) !important;
      background: var(--bg-transparent) !important;
      border: none !important; /* Removed border as requested */
      box-shadow: none !important;
      backdrop-filter: blur(12px) !important; /* Forces the beautiful frosted glass effect */
      -webkit-backdrop-filter: blur(12px) !important;
    }
    
    /* Bottom Navigation Bar - REMOVE BORDERS */
    main-navbar {
      border: none !important; /* Removed border as requested */
      box-shadow: none !important;
    }

    /* =========================================================
       4. APPLY SURFACE COLORS TO CARDS AND INPUTS (#111 -> #262626)
       ========================================================= */
    /* Calls cards, Following cards, Search inputs, Notes, and UI elements */
    .call-card,
    .creator-card,
    .search-input-box,
    .search-container input,
    .search-input,
    .grid-item,
    .creator-pfp,
    .skel-shimmer,
    .note-bubble,
    .note-card,
    .action-button,
    .add-note-btn,
    .modal-card,
    /* NEW: Force Bottom Sheets, Menus, and Modal Contents to be Surface Color */
    .modal-content, 
    .modal-body, 
    .group-modal, 
    #action-menu, 
    .action-menu, 
    .bottom-sheet, 
    .sheet, 
    .menu-content, 
    .menu-item, 
    .action-item, 
    .dropdown-menu, 
    .dropdown-content, 
    .popup, 
    .dialog,
    .bottom-modal-intro,
    /* MOMENT SPECIFIC UI */
    .moment-card,
    .comment-section,
    .comment-input-area,
    .reply-input-container,
    .moment-options-menu {
      background-color: var(--surface) !important;
      border: none !important; /* Completely removes harsh borders */
      box-shadow: none !important;
    }

    /* FIX: Make the wrapper square completely transparent so the patch disappears */
    .note-item, .story-item {
        background-color: transparent !important;
        background: transparent !important;
        border: none !important;
    }
    
    /* FIX: Force the profile picture border to match the background seamlessly */
    .note-pfp, .story-avatar, .moment-pfp {
        border-color: var(--bg) !important;
    }

    /* FIX: Force note bubble tails to inherit correctly without square patches */
    .note-bubble::after, #my-note-preview::after {
        background-color: inherit !important;
        background: inherit !important;
        border: none !important;
    }

    /* =========================================================
       5. BUTTONS, ACCENTS, AND TEXT ALIGNMENT
       ========================================================= */
    /* Global Buttons & Badges */
    .follow-badge, 
    .start-btn-pulse,
    .action-btn.follow,
    .primary-btn,
    .moment-btn,
    button[id*="submit"],
    button[id*="create"] {
      background-color: var(--accent) !important;
      color: #fff !important;
      border: none !important;
    }
    
    /* Progress Bar */
    #bite-progress-bar, .moment-progress-bar-fill {
      background-color: var(--accent) !important;
      box-shadow: 0 0 12px var(--accent) !important;
    }
    
    /* Search Bar Focus state */
    .search-input-box:focus,
    .search-container input:focus,
    input:focus,
    textarea:focus {
      border: 1px solid var(--accent) !important; /* Keep focus border so it's visible when typing */
      box-shadow: 0 0 10px rgba(0, 149, 246, 0.2) !important;
    }

    /* Ensure secondary text uses the dim gray color */
    .chat-preview, 
    .call-time, 
    .call-type, 
    .creator-stats,
    .time,
    .date,
    .note-text,
    .moment-time,
    .comment-text,
    p,
    .subtitle {
      color: var(--text-dim) !important;
    }

    /* Ensure primary text is soft white */
    .chat-name, 
    .caller-name, 
    .creator-name,
    .moment-author,
    .viewer-name,
    h1, h2, h3, h4,
    .title {
      color: var(--text-main) !important;
    }

    /* Keep the like button red when active, but match text colors */
    .action-btn:not(.liked) .material-icons-round,
    .moment-action:not(.active) .material-icons-round {
      color: var(--text-main) !important;
    }
  `;
};

/**
 * SHADOW DOM PIERCER
 * Recursively searches through the entire DOM to find Web Components
 * and inject the theme stylesheet into their Shadow Roots.
 */
const pierceShadowRoots = (root = document) => {
  const allElements = root.querySelectorAll('*');
  const css = getGlobalCSS();

  allElements.forEach(el => {
    if (el.shadowRoot) {
      // Check if theme already exists in this shadow root
      if (!el.shadowRoot.getElementById('quantum-shadow-theme')) {
        const style = document.createElement('style');
        style.id = 'quantum-shadow-theme';
        style.textContent = css;
        el.shadowRoot.appendChild(style);
        // Recursively pierce deeper in case of nested shadow DOMs
        pierceShadowRoots(el.shadowRoot);
      }
    }
  });
};

/**
 * INITIAL THEME INJECTION (LIGHT DOM)
 */
const injectStyles = () => {
  applyRootVariables();

  const styleId = 'quantum-global-colors';
  let style = document.getElementById(styleId);
  
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  
  style.textContent = getGlobalCSS();
};

/**
 * THE MUTATION BULLDOZER
 * This observer watches the body for any added nodes (like new Modals, 
 * Moments, or dynamically generated Chats) and instantly themes them.
 */
const initBulldozerObserver = () => {
  // Run initial theme pass
  injectStyles();
  pierceShadowRoots();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        // If nodes are added, re-inject and re-pierce shadow DOM
        injectStyles();
        pierceShadowRoots();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

/**
 * MOBILE TOOLBAR ENFORCEMENT
 */
const injectMobileToolbarColor = () => {
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  
  metaTheme.content = theme.mobileToolbarColor;
};

/**
 * EXECUTION SEQUENCE
 * Starts the engine immediately upon file evaluation.
 */
try {
  // Execute immediately upon import
  initBulldozerObserver();
  injectMobileToolbarColor();
  
  // Secondary safety check for slow loading web components
  window.addEventListener('load', () => {
    pierceShadowRoots();
  });
  
  console.log("🟢 Quantum Theme Engine: Active (Piercing Mode Enabled)");
} catch (error) {
  console.error("🔴 Quantum Theme Engine Error:", error);
}

// =========================================================
// END OF THEME.JS - DO NOT REMOVE LINES
// =========================================================
