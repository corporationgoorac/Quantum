// Define your global theme values here
const theme = {
  backgroundColor: '#0f0f11', // Dark background
  textColor: '#e0e0e0',
  primaryColor: '#007bff',
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mobileToolbarColor: '#0f0f11' // Changes the browser UI color on mobile
};

// 1. Force inject global CSS styles and variables
const injectStyles = () => {
  const style = document.createElement('style');
  style.id = 'global-theme-styles';
  
  style.textContent = `
    :root {
      --bg-color: ${theme.backgroundColor};
      --text-color: ${theme.textColor};
      --primary-color: ${theme.primaryColor};
      --font-family: ${theme.fontFamily};
    }

    /* Forcefully apply to body and html */
    html, body {
      background-color: var(--bg-color) !important;
      color: var(--text-color) !important;
      font-family: var(--font-family) !important;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    
    /* Optional: Basic link styling */
    a {
      color: var(--primary-color);
    }
  `;
  
  // Append to head if it doesn't already exist
  if (!document.getElementById('global-theme-styles')) {
    document.head.appendChild(style);
  }
};

// 2. Force inject the mobile browser toolbar color (<meta name="theme-color">)
const injectMobileToolbarColor = () => {
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  
  metaTheme.content = theme.mobileToolbarColor;
};

// Execute the injections immediately when this file is imported
injectStyles();
injectMobileToolbarColor();
