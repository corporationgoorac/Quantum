// components/navbar.js

/**
 * MainNavbar Component
 * A professional, sleek bottom navigation bar.
 * Features:
 * - Premium Glassmorphism & adaptive dark/light mode
 * - Mobile safe-area support for modern smartphones
 * - Custom SVGs for Home, Chat, and Explore (stored in localStorage)
 * - Dynamic active states and high-fidelity micro-animations
 * - MutationObserver to automatically hide during active calls
 */
class MainNavbar extends HTMLElement {
    
    connectedCallback() {
        // --- AUTO-STORAGE LOGIC ---
        // Stores the class definition code to local storage automatically
        localStorage.setItem('goorac_navbar_component', this.constructor.toString());

        // Define SVGs and store them in local storage as requested
        const navSVGs = {
            home: `<svg viewBox="0 0 24 24" class="nav-svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
            chat: `<svg viewBox="0 0 24 24" class="nav-svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
            explore: `<svg viewBox="0 0 24 24" class="nav-svg"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`
        };
        localStorage.setItem('goorac_nav_svgs', JSON.stringify(navSVGs));

        // Import Google Material Icons Round dynamically for Vision and Calls
        if (!document.getElementById('material-icons-round-css')) {
            const link = document.createElement('link');
            link.id = 'material-icons-round-css';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons+Round';
            document.head.appendChild(link);
        }

        // Render the HTML and CSS, passing in our SVGs
        this.render(navSVGs);
        
        // Highlight the current page based on URL
        this._highlightActive();
        
        // Initialize the logic to hide the nav when calls are active
        this._setupVisibilityToggle();
    }

    render(svgs) {
        this.innerHTML = `
        <style>
            /* ==========================================================================
               CSS VARIABLES & THEMING
               ========================================================================== */
            :host {
                display: block;
                /* Light Mode (Refined) */
                --nav-bg: rgba(255, 255, 255, 0.75);
                --nav-border: rgba(0, 0, 0, 0.08);
                --icon-inactive: #8e8e93; 
                --icon-active: #007aff;   
                --vision-color: #00d2ff;   
                --nav-height: 64px;
                --safe-area-bottom: env(safe-area-inset-bottom, 0px);
                
                transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), 
                            transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Dark Mode Variables */
            @media (prefers-color-scheme: dark) {
                :host {
                    --nav-bg: rgba(20, 20, 20, 0.80);
                    --nav-border: rgba(255, 255, 255, 0.12);
                    --icon-inactive: #98989d; 
                    --icon-active: #0a84ff;   
                    --vision-color: #00d2ff;
                }
            }

            /* Visibility Logic */
            .nav-hidden {
                opacity: 0 !important;
                pointer-events: none !important;
                transform: translate(-50%, 100px) !important; 
            }

            /* ==========================================================================
               MAIN NAV CONTAINER (Enhanced Glassmorphism)
               ========================================================================== */
            .bottom-nav {
                position: fixed;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 100%;
                max-width: 600px; 
                
                display: flex;
                justify-content: space-around;
                align-items: center;
                height: calc(var(--nav-height) + var(--safe-area-bottom));
                padding-bottom: var(--safe-area-bottom); 
                
                background: var(--nav-bg);
                backdrop-filter: blur(28px) saturate(180%) contrast(100%);
                -webkit-backdrop-filter: blur(28px) saturate(180%) contrast(100%);
                
                border-top: 0.5px solid var(--nav-border);
                box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.04);
                
                z-index: 9999; 
                
                transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                            opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                            background-color 0.4s ease;
            }

            @media (min-width: 601px) {
                .bottom-nav {
                    bottom: 24px;
                    border-radius: 40px;
                    border: 1px solid var(--nav-border);
                    height: var(--nav-height);
                    padding-bottom: 0;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
                }
            }

            /* ==========================================================================
               NAVIGATION ITEMS & ICONS
               ========================================================================== */
            .nav-item {
                position: relative;
                text-decoration: none;
                color: var(--icon-inactive);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 1;
                height: 100%;
                -webkit-tap-highlight-color: transparent; 
                cursor: pointer;
                transition: color 0.3s ease;
            }

            .nav-item .material-icons-round {
                font-size: 28px; 
                transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                            color 0.3s ease, filter 0.3s ease;
            }

            /* Custom SVG Styling */
            .nav-item .nav-svg {
                width: 26px;
                height: 26px;
                fill: none;
                stroke: currentColor;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;
                transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                            fill 0.3s ease, filter 0.3s ease;
            }

            .nav-item span:not(.material-icons-round) {
                font-size: 10px;
                font-weight: 600;
                margin-top: 4px;
                opacity: 0;
                transform: translateY(4px);
                transition: all 0.3s ease;
            }

            /* ACTIVE STATE */
            .nav-item.active {
                color: var(--icon-active);
            }

            .nav-item.active .material-icons-round,
            .nav-item.active .nav-svg {
                transform: translateY(-2px) scale(1.1); 
                filter: drop-shadow(0px 2px 4px rgba(0,122,255,0.3)); 
            }
            
            /* Fill SVGs slightly when active for a distinct look */
            .nav-item.active .nav-svg {
                fill: rgba(0, 122, 255, 0.15);
            }

            .nav-item.active span:not(.material-icons-round) {
                opacity: 1;
                transform: translateY(0);
            }

            .nav-item:active .material-icons-round,
            .nav-item:active .nav-svg {
                transform: scale(0.85);
                opacity: 0.6;
            }

            /* ==========================================================================
               VISION ICON ENHANCEMENTS
               ========================================================================== */
            .vision-icon-container {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 32px;
                width: 32px;
            }

            .nav-item .vision-graphic {
                color: var(--vision-color);
                animation: vision-skel 2.5s infinite ease-in-out;
            }

            .nav-item.active .vision-graphic {
                filter: drop-shadow(0 0 10px rgba(0, 210, 255, 0.5));
                animation: vision-skel-active 1.5s infinite ease-in-out;
            }

            @keyframes vision-skel {
                0%, 100% { opacity: 0.5; transform: scale(1); }
                50% { opacity: 0.9; transform: scale(1.05); }
            }

            @keyframes vision-skel-active {
                0% { transform: scale(1.1); filter: brightness(1); }
                50% { transform: scale(1.3); filter: brightness(1.3) drop-shadow(0 0 15px rgba(0, 210, 255, 0.8)); }
                100% { transform: scale(1.1); filter: brightness(1); }
            }

            /* Subtle Active Indicator Dot */
            .nav-item::after {
                content: '';
                position: absolute;
                bottom: 8px;
                width: 4px;
                height: 4px;
                background: var(--icon-active);
                border-radius: 50%;
                opacity: 0;
                transform: scale(0);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            
            .nav-item.active::after {
                opacity: 1;
                transform: scale(1);
                bottom: 6px;
            }

        </style>

        <nav class="bottom-nav" id="main-nav-container" aria-label="Main Navigation">
            <a href="home.html" class="nav-item" aria-label="Home">
                ${svgs.home}
                <span>Home</span>
            </a>
            <a href="messages.html" class="nav-item" aria-label="Messages">
                ${svgs.chat}
                <span>Chats</span>
            </a>
            <a href="explore.html" class="nav-item" aria-label="Explore">
                ${svgs.explore}
                <span>Explore</span>
            </a>
            <a href="visionLobby.html" class="nav-item" aria-label="Vision">
                <div class="vision-icon-container">
                    <span class="material-icons-round vision-graphic">live_tv</span>
                </div>
                <span>Vision</span>
            </a>
            <a href="calls.html" class="nav-item" aria-label="Calls">
                <span class="material-icons-round">call</span>
                <span>Calls</span>
            </a>
        </nav>
        `;
    }

    _highlightActive() {
        const path = window.location.pathname;
        const page = path.split("/").pop() || "home.html";
        const links = this.querySelectorAll('.nav-item');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (page === href) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    _setupVisibilityToggle() {
        const navContainer = this.querySelector('#main-nav-container');
        
        const checkVisibility = () => {
            const callScreen = document.getElementById('call-screen');
            
            if (!callScreen) {
                navContainer.classList.remove('nav-hidden');
                return;
            }

            if (callScreen && (callScreen.style.display === 'flex' || callScreen.classList.contains('active'))) {
                navContainer.classList.add('nav-hidden');
            } else {
                navContainer.classList.remove('nav-hidden');
            }
        };

        const observer = new MutationObserver(() => {
            checkVisibility();
        });

        setTimeout(() => {
            const target = document.getElementById('call-screen');
            if (target) {
                observer.observe(target, { 
                    attributes: true, 
                    attributeFilter: ['style', 'class'] 
                });
            }
            checkVisibility();
        }, 1000);
    }
}

// Register the custom element with the browser
customElements.define('main-navbar', MainNavbar);
