const theme = {
  backgroundColor: '#121212', // Instagram-style premium dark gray
  bgTransparent: 'rgba(18, 18, 18, 0.85)', // For the blurry floating headers
  surfaceColor: '#262626',    // Lighter gray for navbars, inputs, and cards
  textColor: '#FAFAFA',       // Soft white
  textDim: '#A8A8A8',         // Muted gray
  accentColor: '#0095F6',     // Instagram's vibrant blue
  mobileToolbarColor: '#121212',
  borderColor: '#333333'      // For subtle dividers
};

const injectStyles = () => {
  const style = document.createElement('style');
  style.id = 'quantum-global-colors';
  
  style.textContent = `
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
    /* Targets the main wrappers, video feeds, and navigation */
    .app-container,
    .main-content,
    .bite-slide, 
    .yt-player-container, 
    #discover-modal, 
    .grid-results, 
    #bites-viewport,
    main-navbar,
    .chat-item {
      background-color: var(--bg) !important;
      background: var(--bg) !important; /* Overrides any gradients */
    }

    /* Top Headers - Give them the transparent blur effect with new dark gray */
    header, 
    .header, 
    .modal-header {
      background-color: var(--bg-transparent) !important;
      background: var(--bg-transparent) !important;
      border-bottom: 1px solid var(--border-color) !important; /* Subtle divider */
    }
    
    /* Bottom Navigation Bar Divider */
    main-navbar {
      border-top: 1px solid var(--border-color) !important;
    }

    /* =========================================================
       4. APPLY SURFACE COLORS TO CARDS AND INPUTS (#111 -> #262626)
       ========================================================= */
    /* Calls cards, Following cards, Search inputs, and UI elements */
    .call-card,
    .creator-card,
    .search-input-box,
    .search-container input,
    .search-input,
    .grid-item,
    .creator-pfp,
    .skel-shimmer {
      background-color: var(--surface) !important;
      border: 1px solid transparent !important; /* Removes harsh borders */
    }

    /* =========================================================
       5. BUTTONS, ACCENTS, AND TEXT ALIGNMENT
       ========================================================= */
    /* Global Buttons & Badges */
    .follow-badge, 
    .start-btn-pulse,
    .action-btn.follow {
      background-color: var(--accent) !important;
      color: #fff !important;
      border: none !important;
    }
    
    /* Progress Bar */
    #bite-progress-bar {
      background-color: var(--accent) !important;
      box-shadow: 0 0 12px var(--accent) !important;
    }
    
    /* Search Bar Focus state */
    .search-input-box:focus,
    .search-container input:focus {
      border-color: var(--accent) !important;
      box-shadow: 0 0 10px rgba(0, 149, 246, 0.2) !important;
    }

    /* Ensure secondary text uses the dim gray color */
    .chat-preview, 
    .call-time, 
    .call-type, 
    .creator-stats,
    .time,
    .date {
      color: var(--text-dim) !important;
    }

    /* Ensure primary text is soft white */
    .chat-name, 
    .caller-name, 
    .creator-name {
      color: var(--text-main) !important;
    }

    /* Keep the like button red when active, but match text colors */
    .action-btn:not(.liked) .material-icons-round {
      color: var(--text-main) !important;
    }
  `;
  
  if (!document.getElementById('quantum-global-colors')) {
    document.head.appendChild(style);
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
injectStyles();
injectMobileToolbarColor();
