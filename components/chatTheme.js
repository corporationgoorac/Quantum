// components/chatTheme.js
(function() {
    window.chatTheme = {
        // App Core Backgrounds
        bg: "#150C0A", // Matched exactly to the top status bar color from the screenshot.
        bgGradient: "radial-gradient(circle at 50% 30%, #150C0A 0%, #150C0A 70%)", // Flattened to solid to prevent any gradient lines breaking the illusion.
        
        // Header
        headerBg: "#150C0A", // Matched to the top line to blend seamlessly.
        headerBlur: "blur(25px)", // The intensity of the glassmorphism blur effect on the header.
        
        // Primary Brand Colors (Buttons, Highlights, Icons)
        accent: "#7A3E31", // Primary brand color. Controls send button, mic button, active states, and highlights.
        accentDark: "#4A221A", // Darker variant of the accent color, used for gradients or pressed states.
        accentDim: "rgba(122, 62, 49, 0.2)", // Transparent variant of the accent color. Used for glows, reply previews, and soft backgrounds.
        
        // Borders and Dividers
        glassBorder: "transparent", // Set to transparent to remove the harsh line and create a full-screen vibe.
        border: "transparent", // Set to transparent to remove all separation lines between toolbars and headers.
        borderLight: "transparent", // Set to transparent.
        
        // Outgoing (Sent) Message Bubbles
        sentBg: "linear-gradient(135deg, #4A221A 0%, #7A3E31 100%)", // The background gradient of the messages you send.
        sentText: "#FDF5F2", // The text color of the messages you send.
        sentShadow: "0 4px 15px rgba(0, 0, 0, 0.4)", // The drop shadow beneath your sent bubbles.
        
        // Incoming (Received) Message Bubbles & Media Pills
        receivedBg: "#1E120F", // Slightly lighter than the background to ensure message bubbles are visible.
        receivedText: "#EADCD8", // The text color of incoming messages.
        receivedShadow: "0 2px 5px rgba(0,0,0,0.5)", // The drop shadow beneath incoming bubbles.
        
        // Typography / Text Variables
        text: "#F5E6E1", // Primary global text color (Usernames, main text input, menu options).
        textSecondary: "#A38F88", // Secondary text color used for timestamps, 'Active now' status, and subtle info.
        textMuted: "#6B5953", // Highly muted text color used for placeholders (e.g., "Message...").
        
        // Modals & Bottom Areas
        mobileToolbarBg: "#150C0A", // Matched exactly to keep symmetry and the full-screen vibe.
        
        // Text Capsule Aura Glow (Dynamically linked to your accent color)
        capsuleGlowUnfocused: "0 -2px 18px color-mix(in srgb, var(--accent) 15%, transparent), 0 8px 25px rgba(0,0,0,0.4)", // Softened slightly for a cleaner professional look
        capsuleGlowFocused: "0 -4px 30px color-mix(in srgb, var(--accent) 40%, transparent), 0 8px 25px color-mix(in srgb, var(--accent) 20%, transparent)", // Softened slightly
        
        // System UI
        // SOLID HEX for Android Status Bar to remove the top border line
        statusBarColor: "#150C0A" // Matched to the exact hex extracted from the image.
    };

    // Apply the theme directly to the root CSS variables
    const root = document.documentElement;
    root.style.setProperty('--bg', window.chatTheme.bg);
    root.style.setProperty('--bg-gradient', window.chatTheme.bgGradient);
    root.style.setProperty('--header-bg', window.chatTheme.headerBg);
    root.style.setProperty('--header-blur', window.chatTheme.headerBlur);
    root.style.setProperty('--accent', window.chatTheme.accent);
    root.style.setProperty('--accent-dark', window.chatTheme.accentDark);
    root.style.setProperty('--accent-dim', window.chatTheme.accentDim);
    root.style.setProperty('--glass-border', window.chatTheme.glassBorder);
    root.style.setProperty('--border', window.chatTheme.border);
    root.style.setProperty('--border-light', window.chatTheme.borderLight);
    root.style.setProperty('--sent-bg', window.chatTheme.sentBg);
    root.style.setProperty('--sent-text', window.chatTheme.sentText);
    root.style.setProperty('--sent-shadow', window.chatTheme.sentShadow);
    root.style.setProperty('--received-bg', window.chatTheme.receivedBg);
    root.style.setProperty('--received-text', window.chatTheme.receivedText);
    root.style.setProperty('--received-shadow', window.chatTheme.receivedShadow);
    root.style.setProperty('--text', window.chatTheme.text);
    root.style.setProperty('--text-secondary', window.chatTheme.textSecondary);
    root.style.setProperty('--text-muted', window.chatTheme.textMuted);
    root.style.setProperty('--mobileToolbarBg', window.chatTheme.mobileToolbarBg);
    root.style.setProperty('--capsule-glow-unfocused', window.chatTheme.capsuleGlowUnfocused);
    root.style.setProperty('--capsule-glow-focused', window.chatTheme.capsuleGlowFocused);

    // DYNAMIC META TAG INJECTION
    // This forces the Android system bar to match your theme color automatically
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute("content", window.chatTheme.statusBarColor);
    } else {
        // Create the tag if it doesn't exist in the HTML head
        const meta = document.createElement('meta');
        meta.name = "theme-color";
        meta.content = window.chatTheme.statusBarColor;
        document.getElementsByTagName('head')[0].appendChild(meta);
    }

    // =========================================================================
    // DYNAMIC CSS INJECTION: Forces chat.html to use the theme everywhere
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('forced-theme-overrides')) {
            const style = document.createElement('style');
            style.id = 'forced-theme-overrides';
            style.innerHTML = `
                /* Input Capsule & Glow - Forced to theme colors */
                .input-area {
                    border: 1px solid var(--glass-border) !important;
                    box-shadow: var(--capsule-glow-unfocused) !important;
                }
                .input-area:focus-within, .input-area.force-expand {
                    border-color: var(--accent) !important;
                    box-shadow: var(--capsule-glow-focused) !important;
                }
                .msg-input { color: var(--text) !important; }

                /* Audio & File Pills - Forced to Received background */
                .msg-audio-pill, .msg-file-pill {
                    background: var(--received-bg) !important;
                    border: 1px solid var(--glass-border) !important;
                }
                .file-icon { background: var(--mobileToolbarBg) !important; }

                /* Modals, Menus, Emoji Tray - Forced to Mobile Toolbar Background */
                #attachment-menu, .menu-card, .react-list-container, .picker-modal-content {
                    background: var(--mobileToolbarBg) !important;
                    border: 1px solid var(--glass-border) !important;
                }
                .reaction-bar {
                    background: var(--bg) !important;
                    border-bottom: 1px solid var(--border) !important;
                }
                .menu-opt {
                    border-bottom: 1px solid var(--border) !important;
                    color: var(--text) !important;
                }
                .picker-header, .react-list-header { border-bottom: 1px solid var(--border) !important; }

                /* Pulse Invite Banner - Forced to Theme Accent */
                #pulse-invite-banner {
                    background: linear-gradient(135deg, var(--accent-dim), rgba(0, 0, 0, 0.8)) !important;
                    border-bottom: 1px solid var(--accent) !important;
                }

                /* Highlight Flash Animation - Forced to Theme Accent */
                @keyframes flashMessageTheme { 
                    0% { background-color: color-mix(in srgb, var(--accent) 50%, transparent) !important; transform: scale(1.02); box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 40%, transparent) !important; } 
                    100% { background-color: transparent !important; transform: scale(1); box-shadow: none !important; } 
                }
                .flash-active { animation: flashMessageTheme 1.5s ease-out !important; }

                /* Time Divider - Increased visibility */
                .time-divider {
                    color: var(--text) !important;
                    font-size: 0.75rem !important;
                    font-weight: 700 !important;
                    opacity: 0.8 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                /* Unsend Button - Forced Red Color */
                #unsend-btn {
                    color: #FF3B30 !important;
                    font-weight: 700 !important;
                }
            `;
            document.head.appendChild(style);
        }
    });

})();
