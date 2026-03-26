const theme = {
  backgroundColor: '#121212', // Instagram-style premium dark gray
  surfaceColor: '#262626',    // Lighter gray for navbars, inputs, and modals
  textColor: '#FAFAFA',       // Soft white
  textDim: '#A8A8A8',         // Muted gray
  accentColor: '#0095F6',     // Instagram's vibrant blue
  mobileToolbarColor: '#121212'
};

const injectStyles = () => {
  const style = document.createElement('style');
  style.id = 'quantum-global-colors';
  
  style.textContent = `
    /* 1. Define the color palette globally */
    :root {
      --bg: ${theme.backgroundColor} !important;
      --surface: ${theme.surfaceColor} !important;
      --text-main: ${theme.textColor} !important;
      --text-dim: ${theme.textDim} !important;
      --accent: ${theme.accentColor} !important;
    }

    /* 2. Apply background to the base body */
    html, body {
      background-color: var(--bg) !important;
      color: var(--text-main) !important;
    }

    /* 3. FORCE OVERRIDE HARDCODED BLACK CONTAINERS */
    /* This forces the full-screen elements blocking the background to use the new theme */
    .bite-slide, 
    .yt-player-container, 
    #discover-modal, 
    .grid-results, 
    #bites-viewport,
    .modal-header,
    main-navbar,
    header {
      background-color: var(--bg) !important;
    }

    /* 4. Apply surface colors to secondary elements */
    .search-input-box,
    .grid-item,
    .creator-pfp,
    .skel-shimmer {
      background-color: var(--surface) !important;
    }

    /* 5. Force the new accent color on buttons and progress bars */
    .follow-badge, 
    .start-btn-pulse {
      background-color: var(--accent) !important;
      color: #fff !important;
    }
    
    #bite-progress-bar {
      background-color: var(--accent) !important;
      box-shadow: 0 0 12px var(--accent) !important;
    }
    
    .search-input-box:focus {
      border-color: var(--accent) !important;
      box-shadow: 0 0 10px rgba(0, 149, 246, 0.2) !important;
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
