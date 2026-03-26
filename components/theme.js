// Define your global theme values here
const theme = {
  backgroundColor: '#000000', // Black for the immersive feed
  textColor: '#ffffff',
  accentColor: '#00d2ff', // Quantum's accent color
  mobileToolbarColor: '#000000'
};

const injectStyles = () => {
  const style = document.createElement('style');
  style.id = 'quantum-global-theme-styles';
  
  style.textContent = `
    /* 1. Global Theme Variables */
    :root {
      --bg: ${theme.backgroundColor} !important;
      --text-main: ${theme.textColor} !important;
      --accent: ${theme.accentColor} !important;
      /* Force nav height to 0 so CSS calculations resolve to full screen */
      --nav-height: 0px !important; 
    }

    /* 2. Forcefully assassinate the Header and Navbar */
    header, 
    main-navbar {
      display: none !important;
      pointer-events: none !important;
      opacity: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
    }

    /* 3. Force Full Screen 100vh overrides for the Bites Feed */
    #bites-viewport {
      height: 100vh !important;
      padding-bottom: 0 !important; /* Removes the gap left by the navbar */
    }

    .bite-slide, 
    .yt-player-container, 
    .loader-slide {
      height: 100vh !important;
    }
  `;
  
  // Append to head if it doesn't already exist
  if (!document.getElementById('quantum-global-theme-styles')) {
    document.head.appendChild(style);
  }
};

// Force inject the mobile browser toolbar color
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
