(function injectGlobalTheme() {
    // 1. Define the Instagram Dark Theme CSS
    const themeCSS = `
        /* =========================================================
           INSTAGRAM COLOR PALETTE & VARIABLES
           ========================================================= */
        :root {
            /* Core Backgrounds */
            --bg: #000000;
            --surface: #121212; /* Slightly elevated elements */
            --surface-light: #262626; /* Inputs, secondary buttons */
            
            /* Accents & Brand */
            --accent: #0095f6; /* Instagram Blue */
            --accent-dim: rgba(0, 149, 246, 0.15);
            --danger: #ed4956; /* Instagram Like/Heart Red */
            --ig-gradient: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
            
            /* Text & Borders */
            --border: #262626; /* Instagram's signature dark border */
            --text-main: #f5f5f5;
            --text: #f5f5f5; /* Fallback for your files using --text */
            --text-dim: #a8a8a8;
            --dim: #a8a8a8;    /* Fallback for your files using --dim */
        }

        /* =========================================================
           FORCEFUL GLOBAL RESETS (IG Typography & Backgrounds)
           ========================================================= */
        html, body {
            background-color: var(--bg) !important;
            color: var(--text-main) !important;
            /* Apple/IG standard system fonts */
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        * { 
            box-sizing: border-box !important; 
            -webkit-tap-highlight-color: transparent; 
        }

        /* =========================================================
           IG-STYLE NAVIGATION & HEADERS
           ========================================================= */
        header, .top-nav {
            background-color: rgba(0, 0, 0, 0.85) !important;
            border-bottom: 1px solid var(--border) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
        }

        main-navbar, .bottom-nav {
            background-color: rgba(0, 0, 0, 0.85) !important;
            border-top: 1px solid var(--border) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
        }

        /* =========================================================
           IG-STYLE MODALS & BOTTOM SHEETS
           ========================================================= */
        .system-popup-card, .modal-content, .bottom-sheet, .action-menu-card {
            background-color: var(--surface) !important;
            /* Instagram style bottom sheets use 16px-20px top radii */
            border-top-left-radius: 20px !important;
            border-top-right-radius: 20px !important;
            border: 1px solid var(--border) !important;
            border-bottom: none !important;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.5) !important;
        }

        /* Modal drag handle (the little pill at the top of IG sheets) */
        .sys-pop-header::before, .modal-drag-handle {
            content: '';
            display: block;
            width: 40px;
            height: 4px;
            background-color: #363636;
            border-radius: 4px;
            margin: 0 auto 15px auto;
        }

        /* =========================================================
           IG-STYLE BUTTONS & INPUTS
           ========================================================= */
        button, .btn {
            border-radius: 8px !important; /* IG standard button roundness */
            font-weight: 600 !important;
        }

        input[type="text"], input[type="password"], textarea, .search-bar {
            background-color: var(--surface-light) !important;
            border: 1px solid transparent !important;
            color: var(--text-main) !important;
            border-radius: 8px !important; /* IG standard input roundness */
            padding: 12px 16px !important;
        }
        
        input:focus, textarea:focus {
            border-color: var(--border) !important;
            outline: none !important;
        }

        /* Drops / Stories Ring Gradient override */
        .dt-avatar {
            border: 2px solid var(--bg) !important;
            padding: 2px !important;
            background: var(--ig-gradient) !important;
        }
        .dt-item.me-empty .dt-avatar {
            background: var(--surface-light) !important; /* Empty story state */
        }
    `;

    // 2. Inject the CSS into the DOM
    const styleEl = document.createElement('style');
    styleEl.id = 'goorac-instagram-theme';
    styleEl.textContent = themeCSS;
    
    // Append to head
    if (document.head) {
        document.head.appendChild(styleEl);
    } else {
        document.addEventListener('DOMContentLoaded', () => document.head.appendChild(styleEl));
    }

    // 3. Forcefully Inject Mobile Toolbar / Status Bar Color
    function setMetaThemeColor(color) {
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.name = 'theme-color';
            document.head.appendChild(metaTheme);
        }
        metaTheme.content = color; // Sets the browser URL bar to pitch black
        
        let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (!appleStatusBar) {
            appleStatusBar = document.createElement('meta');
            appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
            document.head.appendChild(appleStatusBar);
        }
        appleStatusBar.content = 'black-translucent'; 
    }

    // Match the background color
    setMetaThemeColor('#000000');
})();
