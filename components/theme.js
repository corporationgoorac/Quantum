const theme = {
  backgroundColor: '#000000', // Pure black for the main app background
  surfaceColor: '#111111',    // Slightly lighter dark for navbars/modals
  textColor: '#ffffff',       // White text
  textDim: '#888888',         // Gray for inactive icons and subtitles
  accentColor: '#007AFF',     // The vibrant blue from your toggle switches
  mobileToolbarColor: '#000000'
};

const injectStyles = () => {
  const style = document.createElement('style');
  style.id = 'quantum-global-colors';
  
  style.textContent = `
    /* 1. Define the color palette globally */
    :root {
      --bg: ${theme.backgroundColor};
      --surface: ${theme.surfaceColor};
      --text-main: ${theme.textColor};
      --text-dim: ${theme.textDim};
      --accent: ${theme.accentColor};
    }

    /* 2. ONLY apply background and text colors. No layout changes. */
    html, body {
      background-color: var(--bg) !important;
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
