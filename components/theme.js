(function injectGlobalTheme() {
    const themeCSS = `
        /* =========================================================
           INSTAGRAM COLOR PALETTE & VARIABLES (Forced)
           ========================================================= */
        :root, html, body {
            --bg: #000000 !important;
            --surface: #000000 !important; /* Pitch black for IG feel */
            --surface-light: #262626 !important;
            --accent: #0095f6 !important;
            --accent-dim: rgba(0, 149, 246, 0.15) !important;
            --danger: #ed4956 !important;
            --ig-gradient: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%) !important;
            
            --border: #262626 !important; 
            --text-main: #f5f5f5 !important;
            --text: #f5f5f5 !important; 
            --text-dim: #a8a8a8 !important;
            --dim: #a8a8a8 !important;
            
            color-scheme: dark !important; /* Forces native scrollbars to dark mode */
        }

        /* =========================================================
           FORCE GLOBAL BACKGROUNDS
           ========================================================= */
        html, body, .content, #dashboard-content {
            background-color: #000000 !important;
            color: #f5f5f5 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }

        * { 
            box-sizing: border-box !important; 
            -webkit-tap-highlight-color: transparent; 
        }

        /* =========================================================
           NO HEADER BORDERS & SOLID BLACK BACKGROUND
           ========================================================= */
        header, .header, .top-nav, .search-container {
            background-color: #000000 !important; /* Solid black instead of greyish glass */
            border-bottom: none !important; /* REMOVED BORDER */
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }

        /* =========================================================
           FIX BOTTOM NAVBAR (Forces Black Background, White Icons)
           ========================================================= */
        main-navbar, .bottom-nav {
            background-color: #000000 !important;
            border-top: 1px solid #262626 !important; /* IG has a subtle top border on nav */
            display: block !important;
        }
        
        /* Forces Shadow DOM variables for the navbar */
        main-navbar {
            --bg: #000000 !important;
            --surface: #000000 !important;
            --text: #ffffff !important;
            --dim: #888888 !important;
        }

        /* =========================================================
           MODALS, INPUTS & AVATARS
           ========================================================= */
        .system-popup-card, .modal-content, .bottom-sheet, .action-menu-card {
            background-color: #121212 !important;
            border-top-left-radius: 20px !important;
            border-top-right-radius: 20px !important;
            border: 1px solid var(--border) !important;
            border-bottom: none !important;
        }

        input[type="text"], input[type="password"], textarea, .search-bar, .search-input {
            background-color: #262626 !important;
            border: 1px solid transparent !important;
            color: #ffffff !important;
            border-radius: 8px !important; 
        }

        .dt-avatar {
            border: 2px solid #000000 !important;
            padding: 2px !important;
            background: var(--ig-gradient) !important;
        }
    `;

    // 2. Inject CSS
    const styleEl = document.createElement('style');
    styleEl.id = 'goorac-instagram-theme';
    styleEl.textContent = themeCSS;
    
    // DELAY INJECTION: This ensures it loads AFTER your local HTML <style> tags so it overrides them properly.
    function applyStyles() {
        document.head.appendChild(styleEl);
        
        // 3. Force Mobile Toolbar Color to Pitch Black
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.name = 'theme-color';
            document.head.appendChild(metaTheme);
        }
        metaTheme.content = '#000000';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyStyles);
    } else {
        applyStyles();
    }
})();
