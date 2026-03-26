const theme = {
  backgroundColor: '#121212', // Instagram-style premium dark gray
  surfaceColor: '#262626',    // Lighter gray for navbars, lines, and modals
  textColor: '#FAFAFA',       // Soft white (easier on the eyes than pure #FFF)
  textDim: '#A8A8A8',         // Muted gray for inactive icons and subtitles
  accentColor: '#0095F6',     // Instagram's signature vibrant blue
  mobileToolbarColor: '#121212' // Matches the background
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
