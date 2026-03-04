// components/navbar.js

/**
 * MainNavbar Component
 * A professional, sleek bottom navigation bar.
 * Features:
 * - Premium Glassmorphism & adaptive dark/light mode
 * - Mobile safe-area support for modern smartphones (notch/home indicator)
 * - Dynamic active states and high-fidelity micro-animations
 * - MutationObserver to automatically hide during active calls
 * - Real-time Unread Messages Badge (Firebase + Local Cache optimized)
 */
class MainNavbar extends HTMLElement {
    
    /**
     * Called when the element is inserted into the DOM.
     * Contains initialization logic, DOM rendering, and event bindings.
     */
    connectedCallback() {
        // --- AUTO-STORAGE LOGIC ---
        // Stores the class definition code to local storage automatically
        // (Retained exactly as requested)
        localStorage.setItem('goorac_navbar_component', this.constructor.toString());

        // Import Google Material Icons Round dynamically if not already present
        if (!document.getElementById('material-icons-round-css')) {
            const link = document.createElement('link');
            link.id = 'material-icons-round-css';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons+Round';
            document.head.appendChild(link);
        }

        // Render the HTML and CSS
        this.render();
        
        // Highlight the current page based on URL
        this._highlightActive();
        
        // Initialize the logic to hide the nav when calls are active
        this._setupVisibilityToggle();

        // Initialize the unread message listener
        this._initUnreadListener();
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
                
                z-index: 9999; /* Ensure priority */
                
                transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                            opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                            background-color 0.4s ease;
            }

            /* Floating Tablet/Desktop Mode */
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
            }

            .nav-item .material-icons-round {
                font-size: 28px; 
                transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                            color 0.3s ease,
                            filter 0.3s ease;
            }

            .nav-item span:not(.material-icons-round) {
                font-size: 10px;
                font-weight: 600;
                margin-top: 4px;
                opacity: 0;
                transform: translateY(4px);
                transition: all 0.3s ease;
            }

            /* ACTIVE STATE - Refined Scaling and Glow */
            .nav-item.active {
                color: var(--icon-active);
            }

            .nav-item.active .material-icons-round {
                transform: translateY(-2px) scale(1.1); 
                filter: drop-shadow(0px 2px 4px rgba(0,122,255,0.3)); 
            }

            .nav-item.active span:not(.material-icons-round) {
                opacity: 1;
                transform: translateY(0);
            }

            /* Micro-Interaction on Tap */
            .nav-item:active .material-icons-round {
                transform: scale(0.85);
                opacity: 0.6;
            }

            /* ==========================================================================
               UNREAD BADGE STYLING (Professional look)
               ========================================================================== */
            .icon-wrapper {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .unread-badge {
                position: absolute;
                top: -2px;
                right: -6px;
                background-color: #FF3B30; /* Professional iOS Red */
                color: #FFFFFF;
                font-size: 10px;
                font-weight: 700;
                min-width: 18px;
                height: 18px;
                border-radius: 9px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                box-sizing: border-box;
                border: 2px solid var(--nav-bg); /* Punches out the background naturally */
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                opacity: 0;
                transform: scale(0);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease, border-color 0.4s ease;
                pointer-events: none; /* Let clicks pass through to the nav item */
                z-index: 2;
            }

            .unread-badge.show {
                opacity: 1;
                transform: scale(1);
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
                <span class="material-icons-round">home</span>
                <span>Home</span>
            </a>
            <a href="messages.html" class="nav-item" aria-label="Messages">
                <div class="icon-wrapper">
                    <span class="material-icons-round">chat_bubble_outline</span>
                    <div class="unread-badge" id="chat-badge"></div>
                </div>
                <span>Chats</span>
            </a>
            <a href="explore.html" class="nav-item" aria-label="Explore">
                <span class="material-icons-round">explore</span>
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
                // The icon lookup has been updated to search within the wrapper properly
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

    /**
     * Listens for unread messages and updates the badge.
     * Uses a polling mechanism to ensure Firebase is fully loaded before attaching.
     */
    _initUnreadListener() {
        // 1. Instantly display cached count to prevent layout popping
        const cachedCount = localStorage.getItem('goorac_unread_chat_count');
        if (cachedCount) {
            this._updateBadgeUI(parseInt(cachedCount, 10));
        }

        // 2. Poll for Firebase initialization (fixes Web Component timing issues)
        const checkFirebaseReady = setInterval(() => {
            if (typeof window.firebase !== 'undefined' && firebase.apps.length > 0) {
                clearInterval(checkFirebaseReady); // Stop polling
                this._startFirestoreListener();    // Start the real listener
            }
        }, 500); // Check every half second
    }

    /**
     * Safely attaches the Firebase Snapshot listener once Firebase is confirmed active.
     */
    _startFirestoreListener() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                const db = firebase.firestore();
                
                // Optimized query: Only fetches chats where the user is a participant.
                this._unsubscribeChats = db.collection('chats')
                    .where('participants', 'array-contains', user.uid)
                    .onSnapshot(snapshot => {
                        let unreadChats = 0;
                        
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            // Safely check the nested unreadCount object map for the current user's UID
                            if (data.unreadCount && data.unreadCount[user.uid] > 0) {
                                unreadChats++;
                            }
                        });
                        
                        // Update cache and UI
                        localStorage.setItem('goorac_unread_chat_count', unreadChats.toString());
                        this._updateBadgeUI(unreadChats);
                        
                    }, error => {
                        console.error("Navbar Unread Listener Error:", error);
                    });
            } else {
                // Clear state if logged out
                this._updateBadgeUI(0);
                localStorage.removeItem('goorac_unread_chat_count');
                if (this._unsubscribeChats) this._unsubscribeChats();
            }
        });
    }

    /**
     * Updates the physical DOM element for the badge.
     */
    _updateBadgeUI(count) {
        const badge = this.querySelector('#chat-badge');
        if (!badge) return;

        if (count > 0) {
            // Cap the visual number at 99+ for a clean UI
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.add('show');
        } else {
            badge.classList.remove('show');
        }
    }
}

// Register the custom element with the browser
customElements.define('main-navbar', MainNavbar);
