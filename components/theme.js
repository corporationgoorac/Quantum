(function injectGlobalTheme() {
    const themeCSS = `
        /* =========================================================
           FORCE VARIABLES (Even inside Web Component Shadow DOMs)
           ========================================================= */
        :root, :host, html, body {
            --bg: #000000 !important;
            --surface: #000000 !important;
            --surface-light: #262626 !important;
            --accent: #0095f6 !important;
            --border: #262626 !important;
            --text-main: #f5f5f5 !important;
            --text: #f5f5f5 !important;
            --text-dim: #a8a8a8 !important;
            --dim: #a8a8a8 !important;
            color-scheme: dark !important;
        }

        /* =========================================================
           FORCE PITCH BLACK BACKGROUNDS EVERYWHERE
           ========================================================= */
        html, body, .content, #dashboard-content, main {
            background-color: #000000 !important;
            color: #f5f5f5 !important;
        }

        /* =========================================================
           REMOVE ALL HEADER BORDERS & SHADOWS
           ========================================================= */
        header, .header, .top-nav, .search-container {
            background-color: #000000 !important;
            border: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }

        /* =========================================================
           FIX BOTTOM NAVBAR (Force Black, Remove White Glitch)
           ========================================================= */
        main-navbar, .bottom-nav {
            background-color: #000000 !important;
            border-top: 1px solid #262626 !important; /* Optional: IG style separator */
            display: block !important;
        }
        
        /* Explicitly force the variables onto the navbar element itself */
        main-navbar {
            --bg: #000000 !important;
            --surface: #000000 !important;
            --text: #ffffff !important;
            --dim: #888888 !important;
            --border: #262626 !important;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'goorac-master-theme';
    styleEl.textContent = themeCSS;

    // We use a function to inject this into the BODY, not the HEAD.
    // This ensures it has higher priority than any <style> tag written in your HTML files.
    function forceInject() {
        if (document.getElementById('goorac-master-theme')) return;
        
        // Append to body to crush local HTML styles
        (document.body || document.documentElement).appendChild(styleEl);
        
        // Force Mobile URL bar to Black
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.name = 'theme-color';
            document.head.appendChild(metaTheme);
        }
        metaTheme.content = '#000000';
    }

    // Attach to multiple lifecycle events to guarantee it applies and stays applied
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceInject);
        window.addEventListener('load', forceInject);
    } else {
        forceInject();
    }
})();
