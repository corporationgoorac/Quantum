// components/navbar.js

/**
 * MainNavbar Component
 * A professional, sleek bottom navigation bar.
 * Features:
 * - Premium Glassmorphism & adaptive dark/light mode
 * - Mobile safe-area support for modern smartphones (notch/home indicator)
 * - Dynamic active states and high-fidelity micro-animations
 * - MutationObserver to automatically hide during active calls
 */
class MainNavbar extends HTMLElement {
    
    /**
     * Called when the element is inserted into the DOM.
     * Contains initialization logic, DOM rendering, and event bindings.
     */
    connectedCallback() {
        // --- AUTO-STORAGE LOGIC ---
        // Stores the class definition code to local storage automatically
        localStorage.setItem('goorac_navbar_component', this.constructor.toString());
        
        // Added: Stores SVG state to local storage explicitly to prevent any flicker as requested
        localStorage.setItem('goorac_navbar_svg_cached', 'true');

        // Import Google Material Icons Round dynamically if not already present
        if (!document.getElementById('material-icons-round-css')) {
            const link = document.createElement('link');
            link.id = 'material-icons-round-css';
            link.rel = 'stylesheet';
            // Changed to Material Symbols Rounded to support CSS outline/fill switching for all icons
            link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0..1,0';
            document.head.appendChild(link);
        }

        // Render the HTML and CSS
        this.render();
        
        // Highlight the current page based on URL
        this._highlightActive();
        
        // Initialize the logic to hide the nav when calls are active
        this._setupVisibilityToggle();
    }

    /**
     * Renders the internal styling and HTML structure for the component.
     */
    render() {
        this.innerHTML = `
        <style>
            /* ==========================================================================
               CSS VARIABLES & THEMING
               ========================================================================== */
            :host {
                display: block;
                /* Light Mode (Refined) */
                --nav-bg: rgba(255, 255, 255, 0.72);
                --nav-border: rgba(0, 0, 0, 0.05);
                --icon-inactive: #8e8e93; 
                --icon-active: #007aff;   
                --vision-color: #00d2ff;   
                --nav-height: 68px;
                --safe-area-bottom: env(safe-area-inset-bottom, 0px);
                
                transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), 
                            transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* Dark Mode Variables */
            @media (prefers-color-scheme: dark) {
                :host {
                    --nav-bg: rgba(28, 28, 30, 0.75);
                    --nav-border: rgba(255, 255, 255, 0.08);
                    --icon-inactive: #98989d; 
                    --icon-active: #0a84ff;   
                    --vision-color: #00d2ff;
                }
            }

            /* Visibility Logic (Premium Exit) */
            .nav-hidden {
                opacity: 0 !important;
                pointer-events: none !important;
                transform: translate(-50%, 40px) scale(0.96) !important; 
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
                backdrop-filter: blur(24px) saturate(210%);
                -webkit-backdrop-filter: blur(24px) saturate(210%);
                
                border-top: 0.5px solid var(--nav-border);
                box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.03);
                
                z-index: 9999; 
                
                transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                            opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                            background-color 0.4s ease;
            }

            /* Floating Tablet/Desktop Mode */
            @media (min-width: 601px) {
                .bottom-nav {
                    bottom: 24px;
                    border-radius: 32px;
                    border: 1px solid var(--nav-border);
                    height: 72px;
                    padding-bottom: 0;
                    width: 92%;
                    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.16);
                }
            }

            /* ==========================================================================
               NAVIGATION ITEMS
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
                gap: 2px;
            }

            .nav-item .material-icons-round {
                font-family: 'Material Symbols Rounded', sans-serif;
                font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; 
                font-size: 26px; 
                transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                            color 0.3s ease,
                            filter 0.3s ease,
                            font-variation-settings 0.4s ease;
            }

            .nav-item span:not(.material-icons-round) {
                font-size: 11px;
                font-weight: 500;
                letter-spacing: -0.1px;
                margin-top: 2px;
                opacity: 0.7;
                transform: translateY(0);
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* ACTIVE STATE - Refined Scaling and Glow */
            .nav-item.active {
                color: var(--icon-active);
            }

            .nav-item.active .material-icons-round {
                font-variation-settings: 'FILL' 1, 'wght' 450, 'GRAD' 0, 'opsz' 24; 
                transform: translateY(-4px) scale(1.1); 
                filter: drop-shadow(0px 4px 8px rgba(0,122,255,0.25)); 
            }

            /* Micro-Interaction on Tap */
            .nav-item:active .material-icons-round {
                transform: scale(0.9) translateY(0);
                opacity: 0.7;
            }

            .nav-item.active span:not(.material-icons-round) {
                opacity: 1;
                font-weight: 700;
                transform: translateY(-2px);
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
                animation: vision-skel 3s infinite ease-in-out;
            }

            .nav-item.active .vision-graphic {
                filter: drop-shadow(0 0 12px rgba(0, 210, 255, 0.6));
                animation: vision-skel-active 2s infinite cubic-bezier(0.45, 0.05, 0.55, 0.95);
            }

            @keyframes vision-skel {
                0%, 100% { opacity: 0.6; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.03); }
            }

            @keyframes vision-skel-active {
                0% { transform: scale(1.1); filter: brightness(1) drop-shadow(0 0 5px rgba(0, 210, 255, 0.4)); }
                50% { transform: scale(1.25); filter: brightness(1.2) drop-shadow(0 0 18px rgba(0, 210, 255, 0.9)); }
                100% { transform: scale(1.1); filter: brightness(1) drop-shadow(0 0 5px rgba(0, 210, 255, 0.4)); }
            }

            /* Subtle Active Indicator Dot (Floating Pill Style) */
            .nav-item::after {
                content: '';
                position: absolute;
                bottom: 10px;
                width: 14px;
                height: 3px;
                background: var(--icon-active);
                border-radius: 10px;
                opacity: 0;
                transform: scaleX(0);
                transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
            }
            .nav-item.active::after {
                opacity: 1;
                transform: scaleX(1);
                bottom: 4px;
            }

            /* ==========================================================================
               INLINE SVG ICON STYLES (Person Search Support)
               ========================================================================== */
            svg.material-icons-round {
                width: 26px;
                height: 26px;
                fill: currentColor;
            }
            .icon-filled { display: none; }
            .icon-outline { display: block; }
            .nav-item.active .icon-filled { display: block; }
            .nav-item.active .icon-outline { display: none; }

        </style>

        <nav class="bottom-nav" id="main-nav-container" aria-label="Main Navigation">
            <a href="home.html" class="nav-item" aria-label="Home">
                <span class="material-icons-round" style="display:none;">home</span>
                <svg class="material-icons-round svg-icon" viewBox="0 0 24 24"><g class="icon-outline"><path d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></g><g class="icon-filled"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></g></svg>
                <span>Home</span>
            </a>
            <a href="bites.html" class="nav-item" aria-label="Bites">
                <span class="material-icons-round" style="display:none;">amp_stories</span>
                <svg class="material-icons-round svg-icon" viewBox="0 0 24 24"><g class="icon-outline"><path d="M7 19h10V5H7v14zm2-12h6v10H9V7zM3 17h2V7H3v10zm16-10v10h2V7h-2z"/></g><g class="icon-filled"><path d="M7 19h10V5H7v14zM3 17h2V7H3v10zm16-10v10h2V7h-2z"/></g></svg>
                <span>Bites</span>
            </a>
            <a href="messages.html" class="nav-item" aria-label="Messages">
                <span class="material-icons-round" style="display:none;">chat_bubble_outline</span>
                <svg class="material-icons-round svg-icon" viewBox="0 0 24 24"><g class="icon-outline"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></g><g class="icon-filled"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></g></svg>
                <span>Chats</span>
            </a>
            <a href="explore.html" class="nav-item" aria-label="Explore">
                <span class="material-icons-round" style="display:none;">person_search</span>
                <svg class="material-icons-round svg-icon" viewBox="0 0 24 24">
                    <g class="icon-outline">
                        <path d="M10,12c2.21,0,4-1.79,4-4s-1.79-4-4-4S6,5.79,6,8S7.79,12,10,12z M10,6c1.1,0,2,0.9,2,2s-0.9,2-2,2S8,9.1,8,8S8.9,6,10,6z M10,14c-2.67,0-8,1.34-8,4v2h8.52c-0.33-0.62-0.52-1.32-0.52-2.06c0-0.67,0.15-1.31,0.42-1.88C10.15,14.7,7.84,14,10,14z M20.71,19.29l-1.42-1.42c0.45-0.54,0.71-1.23,0.71-1.99c0-1.72-1.4-3.12-3.12-3.12s-3.12,1.4-3.12,3.12s1.4,3.12,3.12,3.12c0.75,0,1.44-0.27,1.99-0.71l1.42,1.42L20.71,19.29z M16.88,17.25c-0.76,0-1.38-0.62-1.38-1.38s0.62-1.38,1.38-1.38s1.38,0.62,1.38,1.38S17.63,17.25,16.88,17.25z"/>
                    </g>
                    <g class="icon-filled">
                        <path d="M10,12c2.21,0,4-1.79,4-4s-1.79-4-4-4S6,5.79,6,8S7.79,12,10,12z M10,14c-2.67,0-8,1.34-8,4v2h8.52c-0.33-0.62-0.52-1.32-0.52-2.06c0-0.67,0.15-1.31,0.42-1.88C10.15,14.7,7.84,14,10,14z M20.71,19.29l-1.42-1.42c0.45-0.54,0.71-1.23,0.71-1.99c0-1.72-1.4-3.12-3.12-3.12s-3.12,1.4-3.12,3.12s1.4,3.12,3.12,3.12c0.75,0,1.44-0.27,1.99-0.71l1.42,1.42L20.71,19.29z M16.88,17.25c-0.76,0-1.38-0.62-1.38-1.38s0.62-1.38,1.38-1.38s1.38,0.62,1.38,1.38S17.63,17.25,16.88,17.25z"/>
                    </g>
                </svg>
                <span>Explore</span>
            </a>
            <a href="visionLobby.html" class="nav-item" aria-label="Vision">
                <div class="vision-icon-container">
                    <span class="material-icons-round vision-graphic" style="display:none;">live_tv</span>
                    <svg class="material-icons-round vision-graphic svg-icon" viewBox="0 0 24 24"><g class="icon-outline"><path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z"/></g><g class="icon-filled"><path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zM9 10v8l7-4z"/></g></svg>
                </div>
                <span>Vision</span>
            </a>
        </nav>
        `;
    }

    /**
     * Examines the current window URL and applies the 'active' class
     */
    _highlightActive() {
        const path = window.location.pathname;
        const page = path.split("/").pop() || "home.html";
        const links = this.querySelectorAll('.nav-item');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (page === href) {
                link.classList.add('active');
                // Fill in the chat bubble icon if it's the active page
                const icon = link.querySelector('.material-icons-round');
                if (icon && icon.innerText === 'chat_bubble_outline') {
                    icon.innerText = 'chat_bubble';
                }
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Logic to observe and hide the navbar when #call-screen is visible.
     */
    _setupVisibilityToggle() {
        const navContainer = this.querySelector('#main-nav-container');
        
        const checkVisibility = () => {
            const callScreen = document.getElementById('call-screen');
            
            // Added falsy check here to prevent errors if element doesn't exist
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
