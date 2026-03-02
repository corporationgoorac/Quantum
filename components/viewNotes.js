/**
 * =======================================================
 * PART 1: THE VIEWER COMPONENT (Bottom Sheet UI)
 * =======================================================
 */
class ViewNotes extends HTMLElement {
    constructor() {
        super();
        this.currentNote = null;
        this.currentUserProfile = null;
        this.isOwnNote = false;
        this.audioPlayer = new Audio();
        this.audioPlayer.loop = true;
        
        this.db = null; 
        this.unsubscribe = null;

        // Enhanced Swipe Logic - Preserving Physics
        this.state = {
            isDragging: false,
            startY: 0,
            currentY: 0,
            sheetHeight: 0,
            startTime: 0 
        };
        
        this.lastTap = 0;
    }

    connectedCallback() {
        if (window.firebase && !this.db) {
            this.db = firebase.firestore();
        }
        this.render();
        this.setupEventListeners();
        this.setupSwipeLogic();
    }

    getRelativeTime(timestamp) {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d`;
    }

    getIcons() {
        return {
            heartEmpty: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            heartFilled: `<svg width="28" height="28" viewBox="0 0 24 24" fill="#ff3b30" stroke="#ff3b30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            send: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0095f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
            verified: `<span class="material-icons-round" style="color:#0095f6; font-size:16px; margin-left:4px; vertical-align:middle;">verified</span>`,
            closeFriendsBadge: `<div style="display:inline-flex; align-items:center; justify-content:center; background:#00ba7c; border-radius:50%; width:18px; height:18px; margin-left:6px; box-shadow:0 0 5px rgba(0,186,124,0.4);"><svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>`
        };
    }

    render() {
        this.innerHTML = `
        <link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Bangers&family=Dancing+Script:wght@700&family=Fredoka:wght@600&family=Orbitron:wght@700&family=Playfair+Display:ital,wght@1,700&family=Righteous&display=swap" rel="stylesheet">
        <style>
            .vn-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); display: none; z-index: 2000;
                justify-content: center; align-items: flex-end;
                backdrop-filter: blur(8px); 
                opacity: 0; transition: opacity 0.3s ease;
                touch-action: none; 
            }
            .vn-overlay.open { display: flex; opacity: 1; }
            
            .vn-sheet {
                background: #121212; width: 100%; max-width: 500px;
                border-radius: 32px 32px 0 0; 
                transform: translateY(100%); 
                transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                position: absolute; bottom: 0; left: 0; right: 0; margin: 0 auto;
                height: 92dvh; 
                max-height: 850px;
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex; flex-direction: column;
                overflow: hidden;
                box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
                will-change: transform;
                touch-action: pan-y;
            }
            .vn-overlay.open .vn-sheet { transform: translateY(0); }
            
            /* --- BACKGROUND LAYERS --- */
            .vn-bg-layer { position: absolute; inset: 0; z-index: 0; background-size: cover; background-position: center; transition: background 0.3s; opacity: 1; }
            
            .vn-texture {
                position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0;
                background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E");
            }
            .vn-texture.visible { opacity: 0.15; }

            .vn-grid {
                position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.05;
                background-size: 40px 40px;
                background-image: radial-gradient(circle, #ffffff 1px, transparent 1px);
            }
            
            .vn-dim-layer {
                 position: absolute; inset: 0; z-index: 2;
                 background: rgba(0,0,0,0.3);
                 backdrop-filter: blur(5px);
            }

            /* --- HEADER --- */
            .vn-header {
                position: absolute; top: 0; left: 0; width: 100%;
                height: 60px;
                display: flex; justify-content: center; align-items: center;
                z-index: 50;
            }
            
            .vn-drag-handle { 
                width: 48px; height: 5px; background: rgba(255,255,255,0.4); 
                border-radius: 10px; cursor: grab;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }

            .vn-close-btn {
                position: absolute; right: 20px; top: 20px;
                width: 32px; height: 32px; border-radius: 50%;
                background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
                display: flex; align-items: center; justify-content: center;
                color: #fff; cursor: pointer; border: 1px solid rgba(255,255,255,0.05);
            }

            /* --- CONTENT AREA (FIXED FOR SQUARE) --- */
            .vn-content {
                flex: 1; display: flex; flex-direction: column;
                justify-content: flex-start; align-items: center;
                position: relative; z-index: 5;
                width: 100%;
                padding-bottom: 20px;
                min-height: 400px;
            }

            /* THE BUBBLE WRAPPER */
            .vn-bubble-wrapper { 
                position: relative; 
                width: 70vw; 
                max-width: 300px; 
                aspect-ratio: 1 / 1; 
                margin: 85px auto 30px auto; 
                overflow: visible; 
                display: flex;
                flex-direction: column;
                z-index: 10;
                flex-shrink: 0;
                opacity: 0;
                will-change: transform, opacity;
                animation: springPop 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            @keyframes springPop {
                0% { opacity: 0; transform: scale(0.5) translateY(50px); }
                60% { opacity: 1; transform: scale(1.05) translateY(-5px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }

            .vn-bubble {
                width: 100%; 
                height: 100%; 
                border-radius: 48px; 
                display: flex; align-items: center; justify-content: center;
                text-align: center; padding: 30px;
                position: relative; z-index: 2;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                overflow: hidden; 
                border: 1px solid rgba(255,255,255,0.15);
            }
            
            .vn-bubble.glass {
                background: rgba(255, 255, 255, 0.15) !important;
                backdrop-filter: blur(20px) !important;
                -webkit-backdrop-filter: blur(20px) !important;
                border: 1px solid rgba(255, 255, 255, 0.3) !important;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
            }

            .vn-note-text { 
                font-size: 2.0rem; 
                font-weight: 700; line-height: 1.2; z-index: 2;
                word-break: break-word; width: 100%; white-space: pre-wrap;
                max-height: 100%;
                display: -webkit-box;
                -webkit-line-clamp: 6; 
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .vn-pfp-sticker {
                position: absolute; 
                bottom: -20px; 
                right: -20px;
                width: 65px; height: 65px; 
                border-radius: 50%;
                border: 4px solid #000;
                background: #333; object-fit: cover; z-index: 10;
                box-shadow: 0 5px 15px rgba(0,0,0,0.4);
            }

            .vn-info-bar {
                display: flex; flex-direction: column; align-items: center; gap: 4px;
                margin-top: 5px; z-index: 10;
                text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                flex-shrink: 0;
            }
            .vn-display-name { 
                font-weight: 700; font-size: 1.15rem; 
                display: flex; align-items: center; justify-content: center;
                color: #fff; letter-spacing: 0.3px;
            }
            .vn-timestamp { 
                font-size: 0.8rem; opacity: 0.7; color: #eee; 
                font-weight: 500; text-transform: uppercase; letter-spacing: 1px; 
                display: flex; align-items: center; gap: 6px;
            }
            
            .vn-cf-tag {
                background: rgba(0, 186, 124, 0.2);
                color: #00ba7c;
                border: 1px solid rgba(0, 186, 124, 0.4);
                padding: 2px 8px; border-radius: 12px;
                font-size: 0.7rem; font-weight: 700;
                text-transform: none;
            }

            .fx-glow { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
            .fx-shadow { text-shadow: 3px 3px 0px rgba(0,0,0,0.8); }

            .vn-pop-heart {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
                opacity: 0; pointer-events: none; z-index: 20;
            }
            .vn-pop-heart.animate { animation: popHeart 0.8s ease-out forwards; }
            @keyframes popHeart {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                20% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
            }

            .vn-music-pill { 
                position: absolute; top: -35px; left: 50%; transform: translateX(-50%);
                display: inline-flex; align-items: center; gap: 10px; 
                background: rgba(15, 15, 15, 0.9); padding: 8px 18px; 
                border-radius: 100px; font-size: 0.8rem; font-weight: 700;
                border: 1px solid rgba(255,255,255,0.2);
                backdrop-filter: blur(15px); color: #fff; z-index: 12;
                box-shadow: 0 5px 20px rgba(0,0,0,0.4);
                max-width: 240px;
                overflow: hidden;
            }
            
            .vn-eq {
                display: flex; align-items: flex-end; gap: 2px; height: 12px;
                flex-shrink: 0;
            }
            .vn-eq span { width: 3px; background: #00d2ff; border-radius: 2px; }
            
            .vn-eq span:nth-child(1) { height: 60%; animation: eq-1 1.2s infinite ease-in-out; }
            .vn-eq span:nth-child(2) { height: 100%; animation: eq-2 1.0s infinite ease-in-out; } 
            .vn-eq span:nth-child(3) { height: 50%; animation: eq-3 1.4s infinite ease-in-out; } 
            
            @keyframes eq-1 { 0%,100%{height:40%} 50%{height:90%} }
            @keyframes eq-2 { 0%,100%{height:100%} 50%{height:50%} }
            @keyframes eq-3 { 0%,100%{height:30%} 50%{height:70%} }

            .vn-song-marquee {
                white-space: nowrap;
                overflow: hidden;
                mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
                -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
                flex: 1;
            }
            
            .vn-song-content {
                display: inline-block;
                padding-left: 0;
                animation: marquee 12s linear infinite;
            }
            
            .vn-song-content.short { animation: none; text-align: center; width: 100%; }

            @keyframes marquee {
                0% { transform: translateX(0); }
                20% { transform: translateX(0); } 
                100% { transform: translateX(-100%); }
            }

            /* --- FOOTER ACTIONS --- */
            .vn-footer {
                padding: 10px 20px calc(30px + env(safe-area-inset-bottom));
                position: relative; z-index: 10;
                background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
            }
            
            .vn-emoji-bar {
                display: flex; justify-content: space-between; margin-bottom: 15px; padding: 0 10px;
            }
            .vn-quick-emoji {
                font-size: 2.2rem; cursor: pointer; transition: transform 0.2s;
                user-select: none; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));
            }
            .vn-quick-emoji:active { transform: scale(1.4); }

            .vn-interaction-bar { 
                display: flex; align-items: center; gap: 10px; 
                background: rgba(40, 40, 40, 0.9); backdrop-filter: blur(20px);
                padding: 6px 6px 6px 18px; border-radius: 35px;
                border: 1px solid rgba(255,255,255,0.15);
            }
            .vn-reply-input { 
                flex: 1; background: none; border: none; color: white; 
                font-size: 1rem; padding: 10px 0; outline: none;
            }
            .vn-reply-input::placeholder { color: #888; }
            
            .vn-send-btn {
                background: transparent; border: none; padding: 8px; cursor: pointer; display: none;
                align-items: center; justify-content: center;
            }
            .vn-send-btn.visible { display: flex; }

            .vn-heart-btn { 
                background: transparent; border: none; cursor: pointer; 
                width: 44px; height: 44px; display: flex; justify-content: center; align-items: center; 
                transition: transform 0.1s; color: #888;
            }
            .vn-heart-btn:active { transform: scale(0.8); }

            /* --- REDESIGNED OWN NOTE MODAL --- */
            .vn-likers-section { 
                flex: 1.2;
                display: flex; 
                flex-direction: column;
                background: #141414; 
                border-top: 1px solid rgba(255,255,255,0.08);
                position: relative;
                z-index: 100;
                overflow: hidden;
            }
            
            .vn-activity-header {
                padding: 16px 20px;
                font-weight: 800;
                font-size: 1rem;
                color: #fff;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }

            .vn-actions-trigger {
                width: 32px; height: 32px; 
                display: flex; align-items: center; justify-content: center;
                border-radius: 50%;
                cursor: pointer;
                color: #fff;
                background: rgba(255,255,255,0.1);
            }
            .vn-actions-trigger:active { background: rgba(255,255,255,0.2); }

            .vn-likers-scroll {
                flex: 1;
                overflow-y: auto;
                padding: 15px 20px;
                padding-bottom: 50px;
                scrollbar-width: none;
            }
            .vn-likers-scroll::-webkit-scrollbar { display: none; }

            .vn-liker-item { 
                display: flex; 
                align-items: center; 
                justify-content: space-between; 
                margin-bottom: 16px; 
                background: rgba(255,255,255,0.03);
                padding: 10px;
                border-radius: 16px;
            }
            
            /* --- SECONDARY ACTIONS MODAL --- */
            .vn-actions-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 2200;
                display: none; justify-content: center; align-items: flex-end;
                opacity: 0; transition: opacity 0.2s ease;
            }
            .vn-actions-overlay.open { display: flex; opacity: 1; }

            .vn-actions-sheet {
                background: #1e1e1e; width: 100%; max-width: 500px;
                border-radius: 24px 24px 0 0; padding: 25px 20px;
                transform: translateY(100%);
                transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
                display: flex; flex-direction: column; gap: 12px;
                padding-bottom: calc(25px + env(safe-area-inset-bottom));
            }
            .vn-actions-overlay.open .vn-actions-sheet { transform: translateY(0); }

            .vn-btn { 
                width: 100%; padding: 16px; border-radius: 16px; border: none; 
                font-weight: 600; font-size: 1rem; cursor: pointer;
                display: flex; justify-content: center; align-items: center; gap: 12px;
                transition: transform 0.1s;
                text-align: left;
            }
            
            .vn-btn-primary { 
                background: #333; color: #fff; 
            }
            .vn-btn-primary:active { background: #444; transform: scale(0.98); }

            .vn-btn-danger { 
                background: rgba(255, 59, 48, 0.15); color: #ff3b30; 
            }
            .vn-btn-danger:active { background: rgba(255, 59, 48, 0.25); transform: scale(0.98); }

            .vn-btn-archive { 
                background: #2a2a2a; color: #ccc; 
            }
            .vn-btn-archive:active { background: #3a3a3a; transform: scale(0.98); }

            .vn-drag-indicator {
                width: 40px; height: 4px; background: rgba(255,255,255,0.2);
                border-radius: 4px; margin: 0 auto 15px auto;
            }

        </style>

        <div class="vn-overlay" id="vn-overlay">
            <div class="vn-sheet" id="vn-sheet">
                
                <div class="vn-bg-layer" id="bg-layer"></div>
                <div class="vn-dim-layer"></div>
                <div class="vn-texture" id="tex-layer"></div>
                <div class="vn-grid"></div>

                <div class="vn-header">
                    <div class="vn-drag-handle" id="vn-handle"></div>
                    <div class="vn-close-btn" id="btn-close">
                        <span class="material-icons-round">close</span>
                    </div>
                </div>

                <div id="vn-content" style="display:contents;"></div>

            </div>
        </div>

        <div class="vn-actions-overlay" id="vn-actions-overlay">
            <div class="vn-actions-sheet" id="vn-actions-sheet">
                <div class="vn-drag-indicator"></div>
                <div id="vn-actions-content"></div>
            </div>
        </div>
        `;
    }

    setupEventListeners() {
        this.querySelector('#btn-close').onclick = () => this.close();
        this.querySelector('#vn-overlay').onclick = (e) => {
            if (e.target.id === 'vn-overlay') this.close();
        };
        
        // Actions modal dismissal
        const actionsOverlay = this.querySelector('#vn-actions-overlay');
        actionsOverlay.onclick = (e) => {
             if (e.target.id === 'vn-actions-overlay') this.closeActionsModal();
        };

        window.addEventListener('popstate', (event) => {
            const actionsOverlay = this.querySelector('#vn-actions-overlay');
            if (actionsOverlay && actionsOverlay.classList.contains('open')) {
                this.closeActionsModal();
                return; // Stop here, don't close the main note yet
            }

            const overlay = this.querySelector('#vn-overlay');
            if (overlay && overlay.classList.contains('open')) {
                this.close(true);
            }
        });
    }

    setupSwipeLogic() {
        const sheet = this.querySelector('#vn-sheet');
        const dragTarget = sheet; 

        dragTarget.addEventListener('touchstart', (e) => {
            if(e.target.closest('.vn-likers-scroll') && e.target.closest('.vn-likers-scroll').scrollTop > 0) return;
            // Removed sticky actions check since we removed sticky actions
            
            this.state.isDragging = true;
            this.state.startY = e.touches[0].clientY;
            this.state.sheetHeight = sheet.offsetHeight;
            this.state.startTime = new Date().getTime();
            sheet.style.transition = 'none';
        }, {passive: true});

        dragTarget.addEventListener('touchmove', (e) => {
            if (!this.state.isDragging) return;
            
            this.state.currentY = e.touches[0].clientY;
            const delta = this.state.currentY - this.state.startY;
            
            if (delta > 0) {
                if(e.cancelable) e.preventDefault();
                const resistance = 0.8; 
                const translateY = delta * resistance;
                sheet.style.transform = `translateY(${translateY}px)`;
            }
        }, {passive: false});

        dragTarget.addEventListener('touchend', (e) => {
            if (!this.state.isDragging) return;
            this.state.isDragging = false;
            
            const delta = this.state.currentY - this.state.startY;
            const timeDiff = new Date().getTime() - this.state.startTime;
            
            sheet.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            
            const isFlick = delta > 50 && timeDiff < 200;
            const isDragThreshold = delta > (this.state.sheetHeight * 0.2);

            if (isFlick || isDragThreshold) {
                this.close();
            } else {
                sheet.style.transform = `translateY(0)`;
            }
        });
    }

    async open(initialNoteData, isOwnNote = false) {
        if (!this.db && window.firebase) this.db = firebase.firestore();
        if (!this.db) {
            console.error("Firebase not initialized yet.");
            return;
        }

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.isOwnNote = isOwnNote;
        this.currentNote = initialNoteData;
        this.currentUserProfile = null;
        
        this.renderContent();

        const overlay = this.querySelector('#vn-overlay');
        overlay.classList.add('open');
        window.history.pushState({ vnOpen: true }, "", "#view-note");
        
        if(navigator.vibrate) navigator.vibrate(10);
        
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.add('hidden');

        if (initialNoteData && initialNoteData.songPreview) {
            this.audioPlayer.src = initialNoteData.songPreview;
            this.audioPlayer.play().catch(err => {});
        }

        if(initialNoteData.uid) {
            this.db.collection('users').doc(initialNoteData.uid).get().then(doc => {
                if(doc.exists) {
                    this.currentUserProfile = doc.data();
                    this.renderContent(); 
                }
            });
        }

        if (initialNoteData.id) {
            this.unsubscribe = this.db.collection("notes").doc(initialNoteData.id)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        this.currentNote = { ...data, id: doc.id };
                        this.renderContent();
                    } else {
                        this.close();
                    }
                });
        }
    }

    renderContent() {
        const root = this;
        const content = this.querySelector('#vn-content');
        const note = this.currentNote;
        
        if (this.isOwnNote && !note) {
             this.currentNote = { text: "Add a note...", uid: firebase.auth().currentUser.uid };
        }

        const bgStyle = note.bgStyle || note.bgColor || '#000'; 
        root.querySelector('#bg-layer').style.background = bgStyle;

        const texLayer = root.querySelector('#tex-layer');
        if (note.bgTexture) texLayer.classList.add('visible');
        else texLayer.classList.remove('visible');

        content.innerHTML = this.isOwnNote 
            ? this.getOwnNoteHTML(note) 
            : this.getFriendNoteHTML(note);
        
        this.attachDynamicListeners();
    }

    getOwnNoteHTML(note) {
        const timeAgo = this.getRelativeTime(note.createdAt);
        const user = firebase.auth().currentUser;
        const icons = this.getIcons();
        
        const displayPfp = note.pfp || this.currentUserProfile?.photoURL || user?.photoURL || 'https://via.placeholder.com/85';
        const displayName = note.displayName || user?.displayName || this.currentUserProfile?.name || note.username || 'You';
        const isVerified = note.verified === true || this.currentUserProfile?.verified === true; 
        const isCF = note.audience === 'close_friends';

        const textAlign = note.textAlign || 'center';
        let alignItems = 'center';
        if (textAlign === 'left') alignItems = 'flex-start';
        if (textAlign === 'right') alignItems = 'flex-end';
        
        const fontStyle = note.font || '-apple-system, BlinkMacSystemFont, sans-serif';
        const bgColor = note.bgColor || '#262626';
        const txtColor = note.textColor || '#fff';
        const effectClass = (note.effect && note.effect !== 'none') ? `fx-${note.effect}` : '';
        const glassClass = note.isGlass ? 'glass' : '';
        const uiColor = note.textColor || '#ffffff';
        
        const songText = note.songName ? `${note.songName}` : '';
        const isLongText = songText.length > 20;

        // Logic for Timer / Expiry Display
        let timerDisplay = '';
        if (note.isActive !== false) {
            // It is active
            const createdAt = note.createdAt ? (note.createdAt.toDate ? note.createdAt.toDate() : new Date(note.createdAt)) : new Date();
            const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
            const now = new Date();
            const diffMs = expiresAt - now;

            if (diffMs > 0) {
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                timerDisplay = `Expires in ${diffHrs}h ${diffMins}m`;
            } else {
                timerDisplay = 'Expired';
            }
        } else {
            // It is inactive (archived/deleted/expired state)
            timerDisplay = this.getRelativeTime(note.createdAt) + ' ago';
        }

        return `
            <div class="vn-content">
                <div class="vn-bubble-wrapper">
                    ${note.songName ? `
                        <div class="vn-music-pill">
                            <div class="vn-eq"><span></span><span></span><span></span></div>
                            <div class="vn-song-marquee">
                                <div class="vn-song-content ${isLongText ? '' : 'short'}">
                                    ${songText} ${isLongText ? `&nbsp;&nbsp;•&nbsp;&nbsp; ${songText}` : ''}
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="vn-bubble ${glassClass}" style='background:${bgColor}; color:${txtColor}; align-items:${alignItems};'>
                        <div class="vn-note-text ${effectClass}" style='text-align:${textAlign}; font-family:${fontStyle};'>${note.text || 'Share a thought...'}</div>
                    </div>
                    
                    <img src="${displayPfp}" class="vn-pfp-sticker" style="border-color:${txtColor === '#ffffff' ? '#000' : '#fff'}">
                </div>

                <div class="vn-info-bar">
                     <div class="vn-display-name" style="color: ${uiColor};">
                        ${displayName} (You)
                        ${isVerified ? icons.verified : ''}
                    </div>
                    <div class="vn-timestamp" style="color: ${uiColor}; opacity: 0.8;">
                        ${timeAgo} 
                        ${isCF ? icons.closeFriendsBadge : ''}
                    </div>
                </div>
            </div>

            <div class="vn-likers-section">
                <div class="vn-activity-header">
                    <span style="display:flex; flex-direction:column; line-height:1.2;">
                        Activity
                        <span style="font-size:0.8rem; font-weight:500; opacity:0.6; margin-top:2px;">${(note.likes||[]).length} Likes</span>
                    </span>
                    
                    <span style="font-size:0.85rem; font-weight:600; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.5px;">
                        ${timerDisplay}
                    </span>

                    <div class="vn-actions-trigger" id="vn-trigger-actions">
                         <span class="material-icons-round">more_horiz</span>
                    </div>
                </div>
                
                <div class="vn-likers-scroll">
                    ${note.likes && note.likes.length > 0 ? note.likes.map(liker => `
                        <div class="vn-liker-item">
                            <div style="display:flex; align-items:center; gap:12px; color:#fff;">
                                <img src="${liker.photoURL || 'https://via.placeholder.com/44'}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.1);">
                                <span style="font-weight:600; display:flex; align-items:center; gap:4px; font-size:0.95rem;">
                                    ${liker.displayName || 'User'}
                                    ${liker.verified ? icons.verified : ''}
                                </span>
                            </div>
                            <span style="color:#ff3b30;">${icons.heartFilled}</span>
                        </div>
                    `).join('') : `<div style="text-align:center; color:#555; padding:40px 20px; font-size:0.9rem;">No likes yet. Share your note to get started!</div>`}
                </div>
            </div>
        `;
    }

    getFriendNoteHTML(note) {
        const user = firebase.auth()?.currentUser;
        const isLiked = note.likes?.some(l => l.uid === user?.uid);
        let timeAgo = this.getRelativeTime(note.createdAt);
        if (timeAgo !== 'Just now') timeAgo += ' ago';
        const icons = this.getIcons();
        
        const displayPfp = note.pfp || this.currentUserProfile?.photoURL || 'https://via.placeholder.com/85';
        const displayName = note.displayName || this.currentUserProfile?.name || note.username || 'User';
        const isVerified = note.verified === true || this.currentUserProfile?.verified === true;
        const isCF = note.audience === 'close_friends';

        const textAlign = note.textAlign || 'center';
        let alignItems = 'center';
        if (textAlign === 'left') alignItems = 'flex-start';
        if (textAlign === 'right') alignItems = 'flex-end';
        
        const fontStyle = note.font || '-apple-system, BlinkMacSystemFont, sans-serif';
        const bgColor = note.bgColor || '#262626';
        const txtColor = note.textColor || '#fff';
        
        const effectClass = (note.effect && note.effect !== 'none') ? `fx-${note.effect}` : '';
        const glassClass = note.isGlass ? 'glass' : '';
        const uiColor = note.textColor || '#ffffff';

        const songText = note.songName ? `${note.songName} • ${note.songArtist || 'Unknown'}` : '';
        const isLongText = songText.length > 20;

        return `
            <div class="vn-content">
                <div class="vn-bubble-wrapper">
                    ${note.songName ? `
                        <div class="vn-music-pill">
                            <div class="vn-eq"><span></span><span></span><span></span></div>
                            <div class="vn-song-marquee">
                                <div class="vn-song-content ${isLongText ? '' : 'short'}">
                                    ${songText} ${isLongText ? `&nbsp;&nbsp;•&nbsp;&nbsp; ${songText}` : ''}
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="vn-bubble ${glassClass}" id="vn-active-card" style='background:${bgColor}; color:${txtColor}; align-items:${alignItems};'>
                        <div class="vn-pop-heart" id="vn-pop-heart">${icons.heartFilled}</div>
                        <div class="vn-note-text ${effectClass}" style='text-align:${textAlign}; font-family:${fontStyle};'>${note.text}</div>
                    </div>

                    <img src="${displayPfp}" id="vn-pfp-click" class="vn-pfp-sticker" style="cursor:pointer; border-color:${txtColor === '#ffffff' ? '#000' : '#fff'}">
                </div>

                <div class="vn-info-bar">
                     <div class="vn-display-name" id="vn-name-click" style="cursor:pointer; color: ${uiColor};">
                        ${displayName}
                        ${isVerified ? icons.verified : ''}
                    </div>
                    <div class="vn-timestamp" style="color: ${uiColor}; opacity: 0.8;">
                        ${timeAgo}
                        ${isCF ? icons.closeFriendsBadge : ''}
                    </div>
                </div>
            </div>

            <div class="vn-footer">
                <div class="vn-emoji-bar">
                    <span class="vn-quick-emoji" data-emoji="😂">😂</span>
                    <span class="vn-quick-emoji" data-emoji="😮">😮</span>
                    <span class="vn-quick-emoji" data-emoji="😍">😍</span>
                    <span class="vn-quick-emoji" data-emoji="😢">😢</span>
                    <span class="vn-quick-emoji" data-emoji="🔥">🔥</span>
                    <span class="vn-quick-emoji" data-emoji="👏">👏</span>
                </div>
                <div class="vn-interaction-bar">
                    <input type="text" id="vn-reply-input" class="vn-reply-input" placeholder="Reply to ${displayName}..." autocomplete="off">
                    <button id="vn-send-text-btn" class="vn-send-btn">${icons.send}</button>
                    <button class="vn-heart-btn" id="like-toggle-btn">
                        ${isLiked ? icons.heartFilled : icons.heartEmpty}
                    </button>
                </div>
            </div>
        `;
    }

    async handleProfileRedirect() {
        if (!this.currentNote) return;
        const uid = this.currentNote.uid;
        let username = this.currentUserProfile ? this.currentUserProfile.username : null;

        if (!username && this.currentNote.username && !this.currentNote.username.includes(" ")) {
            username = this.currentNote.username;
        }

        if (!username) {
            try {
                if(navigator.vibrate) navigator.vibrate(5);
                const doc = await this.db.collection('users').doc(uid).get();
                if (doc.exists) {
                    username = doc.data().username;
                    if(!this.currentUserProfile) this.currentUserProfile = doc.data();
                }
            } catch (e) {
                console.error("Error fetching user for redirect:", e);
            }
        }

        const param = username || uid;
        window.location.href = `userProfile.html?user=${param}`;
    }

    // --- NEW: ACTIONS MODAL LOGIC ---
    openActionsModal() {
        if(navigator.vibrate) navigator.vibrate(10);
        const container = this.querySelector('#vn-actions-content');
        const overlay = this.querySelector('#vn-actions-overlay');
        const note = this.currentNote;

        let btnsHTML = '';
        
        if (note.isActive) {
             btnsHTML = `
                <button class="vn-btn vn-btn-primary" id="act-update">Update Note <span class="material-icons-round">edit</span></button>
                <button class="vn-btn vn-btn-archive" id="act-archive">Archive Note <span class="material-icons-round">archive</span></button>
                <button class="vn-btn vn-btn-danger" id="act-delete">Delete Forever <span class="material-icons-round">delete</span></button>
             `;
        } else {
             // For archived/inactive notes
             btnsHTML = `
                <button class="vn-btn vn-btn-primary" id="act-new">Post New Note <span class="material-icons-round">add_circle</span></button>
                <button class="vn-btn vn-btn-danger" id="act-delete">Delete Forever <span class="material-icons-round">delete</span></button>
             `;
        }

        container.innerHTML = btnsHTML;
        
        // Push state for back button closing
        window.history.pushState({ vnActionsOpen: true }, "", "#actions");
        overlay.classList.add('open');

        // Attach listeners to new buttons
        const btnUpdate = this.querySelector('#act-update');
        if(btnUpdate) btnUpdate.onclick = () => window.location.href = 'notes.html';

        const btnNew = this.querySelector('#act-new');
        if(btnNew) btnNew.onclick = () => window.location.href = 'notes.html';

        const btnArchive = this.querySelector('#act-archive');
        if(btnArchive) {
            btnArchive.onclick = async () => {
                if(confirm("Archive this note?")) {
                    try {
                        await this.db.collection("notes").doc(note.id).update({ isActive: false });
                        this.closeActionsModal();
                        if(typeof NotesManager !== 'undefined') NotesManager.init();
                    } catch(e) { console.error(e); }
                }
            };
        }

        const btnDelete = this.querySelector('#act-delete');
        if(btnDelete) {
            btnDelete.onclick = async () => {
                if(confirm("Delete permanently? This cannot be undone.")) {
                    try {
                        await this.db.collection("notes").doc(note.id).delete();
                        this.closeActionsModal();
                        this.close(); // Close main note too
                        window.location.reload(); 
                    } catch(e) { console.error(e); }
                }
            };
        }
    }

    closeActionsModal() {
        const overlay = this.querySelector('#vn-actions-overlay');
        overlay.classList.remove('open');
        if (window.location.hash === "#actions") {
            window.history.back();
        }
    }

    attachDynamicListeners() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const icons = this.getIcons();

        // Updated Listeners for PFP and Name Click
        const pfpClick = this.querySelector('#vn-pfp-click');
        if (pfpClick) {
            pfpClick.onclick = () => this.handleProfileRedirect();
        }

        const nameClick = this.querySelector('#vn-name-click');
        if (nameClick) {
            nameClick.onclick = () => this.handleProfileRedirect();
        }

        const card = this.querySelector('#vn-active-card');
        if(card && !this.isOwnNote) {
            card.addEventListener('click', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - this.lastTap;
                if (tapLength < 300 && tapLength > 0) {
                    const popHeart = this.querySelector('#vn-pop-heart');
                    const likeBtn = this.querySelector('#like-toggle-btn');
                    
                    popHeart.classList.add('animate');
                    setTimeout(() => popHeart.classList.remove('animate'), 1000);
                    
                    if(navigator.vibrate) navigator.vibrate([10, 30]);

                    if(likeBtn && likeBtn.innerHTML.includes('fill="none"')) {
                         likeBtn.click();
                    }
                }
                this.lastTap = currentTime;
            });
        }
        
        // Trigger for Actions Modal
        const actionsTrigger = this.querySelector('#vn-trigger-actions');
        if(actionsTrigger) {
            actionsTrigger.onclick = () => this.openActionsModal();
        }

        const likeBtn = this.querySelector('#like-toggle-btn');
        if(likeBtn) {
            likeBtn.onclick = async () => {
                if(navigator.vibrate) navigator.vibrate(10);
                
                const isCurrentlyLiked = likeBtn.innerHTML.includes('#ff3b30');
                likeBtn.innerHTML = isCurrentlyLiked ? icons.heartEmpty : icons.heartFilled;
                likeBtn.style.transform = "scale(1.3)";
                setTimeout(() => likeBtn.style.transform = "scale(1)", 150);

                const batch = this.db.batch();
                const noteRef = this.db.collection("notes").doc(this.currentNote.id);
                
                const notifId = `like_${user.uid}_${this.currentNote.id}`;
                const notifRef = this.db.collection('notifications').doc(notifId);
                const receiverRef = this.db.collection('users').doc(this.currentNote.uid);

                try {
                    if (!isCurrentlyLiked) {
                        const userDoc = await this.db.collection('users').doc(user.uid).get();
                        const userData = userDoc.exists ? userDoc.data() : {};
                        
                        batch.update(noteRef, {
                            likes: firebase.firestore.FieldValue.arrayUnion({ 
                                uid: user.uid, 
                                displayName: userData.name || user.displayName,
                                username: userData.username || user.displayName,
                                photoURL: userData.photoURL || user.photoURL, 
                                verified: userData.verified || false,
                                timestamp: firebase.firestore.Timestamp.now()
                            })
                        });
                        
                        if (this.currentNote.uid !== user.uid) {
                            const docSnap = await notifRef.get();
                            if (!docSnap.exists) {
                                batch.set(notifRef, {
                                    type: 'like',
                                    toUid: this.currentNote.uid,
                                    fromUid: user.uid,
                                    senderName: userData.name || user.displayName || 'User',
                                    senderPfp: userData.photoURL || user.photoURL || 'https://via.placeholder.com/65',
                                    isSenderVerified: userData.verified || false,
                                    noteId: this.currentNote.id,
                                    noteText: this.currentNote.text || '',
                                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                    isSeen: false
                                });
                                batch.update(receiverRef, { unreadCount: firebase.firestore.FieldValue.increment(1) });
                                
                                // ==========================================================
                                // ---> NEW CODE ADDED: PUSHER NOTIFICATION DISPATCH (LIKE)
                                // ==========================================================
                                try {
                                    const senderName = userData.name || user.displayName || 'User';
                                    const senderUsername = userData.username || user.displayName || 'User';
                                    const senderPfp = userData.photoURL || user.photoURL || 'https://via.placeholder.com/65';
                                    const deepLink = `https://www.goorac.biz/chat.html?user=${senderUsername}`;
                                    
                                    // Make sure to replace '/send-pusher-notification' with your actual server endpoint
                                    // that handles triggering Pusher events on your backend.
                                    fetch('https://pish-uigm.onrender.com/send-push', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            targetUid: this.currentNote.uid,
                                            title: `New Like ❤️`,
                                            body: `${senderName} liked your note: "${this.currentNote.text || 'Audio Note'}"`,
                                            icon: senderPfp,
                                            click_action: deepLink
                                        })
                                    }).catch(e => console.error("Pusher Notification API failed:", e));

                                    // If you use standard Pusher client channels directly instead:
                                    if (window.pusherChannel) {
                                        window.pusherChannel.trigger('client-new-notification', {
                                            toUid: this.currentNote.uid,
                                            title: `New Like ❤️`,
                                            body: `${senderName} liked your note`,
                                            icon: senderPfp
                                        });
                                    }
                                } catch (pushErr) {
                                    console.error("Pusher logic failed to execute:", pushErr);
                                }
                                // ==========================================================
                            }
                        }

                    } else {
                        const likerObj = this.currentNote.likes.find(l => l.uid === user.uid);
                        if (likerObj) {
                            batch.update(noteRef, { likes: firebase.firestore.FieldValue.arrayRemove(likerObj) });
                        }
                        if (this.currentNote.uid !== user.uid) {
                            batch.delete(notifRef);
                        }
                    }
                    await batch.commit();
                } catch (e) { 
                    console.error("Like toggle failed", e);
                    likeBtn.innerHTML = isCurrentlyLiked ? icons.heartFilled : icons.heartEmpty; 
                }
            };
        }

        if(this.isOwnNote) return;

        const input = this.querySelector('#vn-reply-input');
        const sendBtn = this.querySelector('#vn-send-text-btn');
        const emojis = this.querySelectorAll('.vn-quick-emoji');
        const heartBtn = this.querySelector('#like-toggle-btn');

        input.addEventListener('input', () => {
            if(input.value.trim().length > 0) {
                sendBtn.classList.add('visible');
                heartBtn.style.display = 'none';
            } else {
                sendBtn.classList.remove('visible');
                heartBtn.style.display = 'flex';
            }
        });

        input.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' && input.value.trim().length > 0) {
                this.handleSendReply(input.value.trim());
                input.value = '';
                input.blur(); 
                sendBtn.classList.remove('visible');
                heartBtn.style.display = 'flex';
            }
        });

        sendBtn.onclick = () => {
            if(input.value.trim().length > 0) {
                this.handleSendReply(input.value.trim());
                input.value = '';
                input.blur(); 
                sendBtn.classList.remove('visible');
                heartBtn.style.display = 'flex';
            }
        };

        emojis.forEach(emojiEl => {
            emojiEl.onclick = () => {
                const emoji = emojiEl.dataset.emoji;
                if(navigator.vibrate) navigator.vibrate(25);
                this.handleSendReply(emoji);
            };
        });
    }

    async handleSendReply(text) {
        if(navigator.vibrate) navigator.vibrate(20);

        const myUid = firebase.auth().currentUser.uid;
        const targetUid = this.currentNote.uid;
        const chatId = myUid < targetUid ? `${myUid}_${targetUid}` : `${targetUid}_${myUid}`;
        
        const noteMetadata = {
            text: this.currentNote.text || "",
            bgColor: this.currentNote.bgColor || "#262626",
            textColor: this.currentNote.textColor || "#fff",
            textAlign: this.currentNote.textAlign || 'center',
            songName: this.currentNote.songName || null,
            username: this.currentNote.username || "User",
            displayName: this.currentNote.displayName || this.currentNote.username || "User",
            pfp: this.currentNote.pfp || null,
            verified: this.currentNote.verified || false,
            uid: this.currentNote.uid,
            font: this.currentNote.font || '-apple-system, BlinkMacSystemFont, sans-serif',
            bgTexture: this.currentNote.bgTexture || false,
            isGlass: this.currentNote.isGlass || false,
            effect: this.currentNote.effect || 'none',
            audience: this.currentNote.audience || 'public'
        };

        try {
            const chatRef = this.db.collection("chats").doc(chatId);
            const messagesRef = chatRef.collection("messages");

            await messagesRef.add({
                text: text,
                sender: myUid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                seen: false,
                replyToNote: this.currentNote.text, 
                noteMetadata: noteMetadata 
            });

            await chatRef.set({
                lastMessage: "Replied to a note", 
                lastSender: myUid,
                lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                participants: [myUid, targetUid],
                seen: false, 
                [`unreadCount.${targetUid}`]: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });

            // ==========================================================
            // ---> NEW CODE ADDED: PUSHER NOTIFICATION DISPATCH (REPLY)
            // ==========================================================
            try {
                // Fetch the sender's username for the deep link
                const userDoc = await this.db.collection('users').doc(myUid).get();
                let senderUsername = "User";
                let senderName = "User";
                let senderPfp = 'https://via.placeholder.com/65';
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    senderUsername = userData.username || "User";
                    senderName = userData.name || userData.username || "User";
                    senderPfp = userData.photoURL || 'https://via.placeholder.com/65';
                }

                const deepLink = `https://www.goorac.biz/chat.html?user=${senderUsername}`;

                // Make sure to replace '/send-pusher-notification' with your backend endpoint
                fetch('https://pish-uigm.onrender.com/send-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetUid: targetUid,
                        title: `New Reply from ${senderName} 💬`,
                        body: text,
                        icon: senderPfp,
                        click_action: deepLink
                    })
                }).catch(e => console.error("Pusher Notification API failed:", e));

                // If you use standard Pusher client channels directly instead:
                if (window.pusherChannel) {
                    window.pusherChannel.trigger('client-new-notification', {
                        toUid: targetUid,
                        title: `New Reply from ${senderName}`,
                        body: text,
                        icon: senderPfp
                    });
                }
            } catch (pushErr) {
                console.error("Pusher logic failed to execute:", pushErr);
            }
            // ==========================================================

        } catch(e) {
            console.error("Failed to send reply", e);
        }
    }

    close(fromHistory = false) {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.audioPlayer.pause();
        this.querySelector('#vn-overlay').classList.remove('open');
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.remove('hidden');

        if (!fromHistory && window.location.hash === "#view-note") {
            window.history.back();
        }
    }
}

customElements.define('view-notes', ViewNotes);


/**
 * =======================================================
 * PART 2: THE NOTES MANAGER (Logic & Styles)
 * =======================================================
 */
const NotesManager = {
    init: function() {
        this.injectBubbleStyles(); 
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    if(document.getElementById('notes-container')) {
                        this.setupMyNote(user);
                        this.loadMutualNotes(user);
                    }
                }
            });
        }
    },

    injectBubbleStyles: function() {
        if(document.getElementById('notes-bubble-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notes-bubble-styles';
        style.innerHTML = `
            #notes-container {
                display: flex;
                overflow-x: auto;
                padding-top: 70px;
                padding-bottom: 10px;
                padding-left: 15px;
                gap: 25px;
                scrollbar-width: none;
                align-items: flex-start;
            }
            #notes-container::-webkit-scrollbar { display: none; }

            .note-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                width: 75px; 
                flex-shrink: 0;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
            }

            .note-bubble, #my-note-preview {
                display: none; 
                flex-direction: column;
                justify-content: center !important;
                align-items: center !important;
                text-align: center;
                position: absolute;
                top: 0px; 
                left: 50%;
                transform: translate(-50%, -100%); 
                z-index: 10;
                padding: 6px 12px !important;
                border-radius: 16px !important;
                font-size: 0.75rem !important;
                width: max-content;
                max-width: 90px; 
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                box-sizing: border-box;
                border: 1px solid rgba(255,255,255,0.1);
                background-size: cover;
                background-position: center;
            }
            
            .note-bubble.cf-note {
                border: 2px solid #00ba7c !important; 
                box-shadow: 0 0 8px rgba(0, 186, 124, 0.4);
            }
            
            .note-bubble.visible, #my-note-preview.visible { display: flex !important; }
            
            .note-bubble::after, #my-note-preview::after {
                content: '';
                position: absolute;
                bottom: -4px;
                left: 50%;
                transform: translateX(-50%);
                width: 6px;
                height: 6px;
                background: inherit;
                border-radius: 50%;
                z-index: -1;
            }

            .note-like-indicator {
                position: absolute;
                top: 72px; 
                right: 0px;  
                background: #1c1c1e;
                border-radius: 50%;
                width: 22px; height: 22px;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.4);
                border: 2px solid #000; 
                z-index: 20;
            }
            .note-like-indicator svg { width: 12px; height: 12px; fill: #ff3b30; stroke: none; }

            .note-text-content {
                line-height: 1.25;
                font-weight: 500;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                width: 100%;
                word-break: break-word; 
            }

            .note-music-tag {
                display: flex; 
                align-items: center; 
                justify-content: center;
                gap: 3px;
                font-size: 0.65rem; 
                opacity: 0.8; 
                margin-top: 2px;
                white-space: nowrap; 
                overflow: hidden; 
                max-width: 100%;
                width: 100%;
            }
            
            .note-music-tag svg { flex-shrink: 0; }
            
            .note-pfp {
                width: 65px;
                height: 65px;
                border-radius: 50%;
                border: 2px solid #262626;
                object-fit: cover;
                background: #333;
                z-index: 2;
            }

            .note-username {
                font-size: 0.75rem;
                margin-top: 6px;
                color: #a0a0a0;
                max-width: 75px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    },

    setupMyNote: function(user) {
        const db = firebase.firestore();
        const btn = document.getElementById('my-note-btn');
        const preview = document.getElementById('my-note-preview');
        
        if (!btn || !preview) return; 

        try {
            const cached = localStorage.getItem('my_note_cache_' + user.uid);
            if (cached) {
                const data = JSON.parse(cached);
                if (!data.expiresAt || new Date(data.expiresAt) > new Date()) {
                    preview.classList.add('visible');
                    preview.style.background = data.bgColor || '#262626'; 
                    preview.style.color = data.textColor || '#fff';
                    preview.innerHTML = `
                        ${data.text ? `<div class="note-text-content" style='text-align:${data.textAlign || 'center'}; font-family:${data.font || 'system-ui'}'>${data.text}</div>` : ''}
                        ${data.songName ? `
                            <div class="note-music-tag">
                                <svg viewBox="0 0 24 24" style="width:10px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                <span>${data.songName.substring(0, 10)}${data.songName.length>10?'...':''}</span>
                            </div>
                        ` : ''}
                    `;
                    btn.classList.add('has-note');
                    btn.onclick = () => {
                        const viewer = document.querySelector('view-notes');
                        if(data && viewer) viewer.open({ ...data }, true);
                    };
                } else {
                    localStorage.removeItem('my_note_cache_' + user.uid);
                }
            }
        } catch(e) {}

        db.collection("notes")
            .where("uid", "==", user.uid)
            .where("isActive", "==", true)
            .onSnapshot(snapshot => {
                let data = null;
                let noteId = null;

                if (!snapshot.empty) {
                    const docs = snapshot.docs;
                    const doc = docs[docs.length - 1]; 
                    data = doc.data();
                    noteId = doc.id;
                    
                    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
                        db.collection("notes").doc(noteId).update({ isActive: false });
                        data = null;
                    }
                }

                if (data) {
                    try {
                        let cacheData = { ...data, id: noteId };
                        if(cacheData.createdAt && cacheData.createdAt.toDate) cacheData.createdAt = cacheData.createdAt.toDate().toISOString();
                        if(cacheData.expiresAt && cacheData.expiresAt.toDate) cacheData.expiresAt = cacheData.expiresAt.toDate().toISOString();
                        localStorage.setItem('my_note_cache_' + user.uid, JSON.stringify(cacheData));
                    } catch(e){}
                } else {
                    localStorage.removeItem('my_note_cache_' + user.uid);
                }

                preview.classList.add('visible');

                if(data && (data.text || data.songName)) {
                    preview.style.background = data.bgColor || '#262626'; 
                    preview.style.color = data.textColor || '#fff';
                    
                    preview.innerHTML = `
                        ${data.text ? `<div class="note-text-content" style='text-align:${data.textAlign || 'center'}; font-family:${data.font || 'system-ui'}'>${data.text}</div>` : ''}
                        ${data.songName ? `
                            <div class="note-music-tag">
                                <svg viewBox="0 0 24 24" style="width:10px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                <span>${data.songName.substring(0, 10)}${data.songName.length>10?'...':''}</span>
                            </div>
                        ` : ''}
                    `;
                    btn.classList.add('has-note');
                    
                    btn.onclick = () => {
                        const viewer = document.querySelector('view-notes');
                        if(data && viewer) viewer.open({ ...data, id: noteId }, true);
                    };
                } else {
                    preview.style.background = 'rgba(255,255,255,0.1)';
                    preview.style.color = 'rgba(255,255,255,0.7)';
                    preview.innerHTML = `<div class="note-text-content" style="font-size:0.7rem; font-weight:400;">What's on your mind?</div>`;
                    btn.classList.remove('has-note');
                    btn.onclick = () => window.location.href = 'notes.html';
                }
            });
    },

    loadMutualNotes: async function(user) {
        const db = firebase.firestore();
        const container = document.getElementById('notes-container');
        if(!container) return;

        let cachedMutualNotes = {};
        try {
            const cached = localStorage.getItem('mutual_notes_cache_' + user.uid);
            if (cached) {
                cachedMutualNotes = JSON.parse(cached);
                for (const [userUid, noteData] of Object.entries(cachedMutualNotes)) {
                    if (noteData.expiresAt && new Date(noteData.expiresAt) > new Date()) {
                        const existingEl = document.getElementById(`note-${userUid}`);
                        if(existingEl) existingEl.remove();

                        const isLiked = noteData.likes && noteData.likes.some(l => l.uid === user.uid);
                        const isCF = noteData.audience === 'close_friends';
                        const div = document.createElement('div');
                        div.id = `note-${userUid}`; 
                        div.className = 'note-item friend-note has-note';
                        
                        const bgStyle = `background:${noteData.bgColor || '#262626'}; color:${noteData.textColor || '#fff'}`;
                        const cfClass = isCF ? 'cf-note' : '';

                        div.innerHTML = `
                            <div class="note-bubble visible ${cfClass}" style="${bgStyle}">
                                <div class="note-text-content" style='text-align:${noteData.textAlign || 'center'}; font-family:${noteData.font || 'system-ui'}'>${noteData.text}</div>
                                ${noteData.songName ? `
                                    <div class="note-music-tag">
                                        <svg viewBox="0 0 24 24" style="width:10px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                        <span>${noteData.songName.substring(0, 10)}${noteData.songName.length>10?'...':''}</span>
                                    </div>
                                ` : ''}
                            </div>
                            <img src="${noteData.pfp || 'https://via.placeholder.com/65'}" class="note-pfp">
                            ${isLiked ? `
                                <div class="note-like-indicator">
                                    <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                </div>` : ''}
                            <span class="note-username">${(noteData.username || 'User').split(' ')[0]}</span>
                        `;
                        div.onclick = () => {
                            const viewer = document.querySelector('view-notes');
                            const nav = document.querySelector('main-navbar');
                            if(nav) nav.classList.add('hidden');
                            if(navigator.vibrate) navigator.vibrate([10, 40]);
                            viewer.open({ ...noteData, id: noteData.id }, false);
                        };
                        container.appendChild(div);
                    } else {
                        delete cachedMutualNotes[userUid];
                    }
                }
                localStorage.setItem('mutual_notes_cache_' + user.uid, JSON.stringify(cachedMutualNotes));
            }
        } catch(e) {}

        try {
            const myProfileDoc = await db.collection("users").doc(user.uid).get();
            const myData = myProfileDoc.data() || {};
            const myFollowing = myData.following || []; 
            const myFollowers = myData.followers || []; 

            const followingUIDs = myFollowing.map(i => typeof i === 'string' ? i : i.uid);
            const followersUIDs = myFollowers.map(i => typeof i === 'string' ? i : i.uid);

            const mutualUIDs = followingUIDs.filter(uid => followersUIDs.includes(uid));

            if(mutualUIDs.length === 0) {
                container.querySelectorAll('.friend-note').forEach(e => e.remove());
                return;
            }

            const chunks = [];
            let tempUIDs = [...mutualUIDs];
            while(tempUIDs.length > 0) chunks.push(tempUIDs.splice(0, 10));

            chunks.forEach(chunk => {
                db.collection("notes")
                    .where("uid", "in", chunk) 
                    .where("isActive", "==", true)
                    .onSnapshot(snapshot => {
                        snapshot.docChanges().forEach(async change => {
                            const noteData = change.doc.data();
                            const noteId = change.doc.id; 
                            const userUid = noteData.uid; 
                            
                            const existingEl = document.getElementById(`note-${userUid}`);
                            if(existingEl) existingEl.remove();

                            if (change.type !== "removed" && (!noteData.expiresAt || noteData.expiresAt.toDate() > new Date())) {
                                
                                if (noteData.audience === 'close_friends' && noteData.uid !== user.uid) {
                                    try {
                                        const authorDoc = await db.collection('users').doc(noteData.uid).get();
                                        const authorData = authorDoc.data();
                                        if (!authorData || !authorData.closeFriends || !authorData.closeFriends.includes(user.uid)) {
                                            if (cachedMutualNotes[userUid]) {
                                                delete cachedMutualNotes[userUid];
                                                localStorage.setItem('mutual_notes_cache_' + user.uid, JSON.stringify(cachedMutualNotes));
                                            }
                                            return; 
                                        }
                                    } catch (e) {
                                        return;
                                    }
                                }

                                try {
                                    let cacheData = { ...noteData, id: noteId };
                                    if(cacheData.createdAt && cacheData.createdAt.toDate) cacheData.createdAt = cacheData.createdAt.toDate().toISOString();
                                    if(cacheData.expiresAt && cacheData.expiresAt.toDate) cacheData.expiresAt = cacheData.expiresAt.toDate().toISOString();
                                    
                                    if(cacheData.likes && Array.isArray(cacheData.likes)) {
                                        cacheData.likes = cacheData.likes.map(l => {
                                            let cleanedLike = {...l};
                                            if(cleanedLike.timestamp && cleanedLike.timestamp.toDate) cleanedLike.timestamp = cleanedLike.timestamp.toDate().toISOString();
                                            return cleanedLike;
                                        });
                                    }

                                    cachedMutualNotes[userUid] = cacheData;
                                    localStorage.setItem('mutual_notes_cache_' + user.uid, JSON.stringify(cachedMutualNotes));
                                } catch(e){}

                                const isLiked = noteData.likes && noteData.likes.some(l => l.uid === user.uid);
                                const isCF = noteData.audience === 'close_friends';
                                const div = document.createElement('div');
                                div.id = `note-${userUid}`; 
                                div.className = 'note-item friend-note has-note';
                                
                                const bgStyle = `background:${noteData.bgColor || '#262626'}; color:${noteData.textColor || '#fff'}`;
                                
                                const cfClass = isCF ? 'cf-note' : '';

                                div.innerHTML = `
                                    <div class="note-bubble visible ${cfClass}" style="${bgStyle}">
                                        <div class="note-text-content" style='text-align:${noteData.textAlign || 'center'}; font-family:${noteData.font || 'system-ui'}'>${noteData.text}</div>
                                        ${noteData.songName ? `
                                            <div class="note-music-tag">
                                                <svg viewBox="0 0 24 24" style="width:10px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                                <span>${noteData.songName.substring(0, 10)}${noteData.songName.length>10?'...':''}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                    <img src="${noteData.pfp || 'https://via.placeholder.com/65'}" class="note-pfp">
                                    ${isLiked ? `
                                        <div class="note-like-indicator">
                                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                        </div>` : ''}
                                    <span class="note-username">${(noteData.username || 'User').split(' ')[0]}</span>
                                `;
                                div.onclick = () => {
                                    const viewer = document.querySelector('view-notes');
                                    const nav = document.querySelector('main-navbar');
                                    if(nav) nav.classList.add('hidden');
                                    
                                    if(navigator.vibrate) navigator.vibrate([10, 40]);
                                    
                                    viewer.open({ ...noteData, id: noteId }, false);
                                };
                                container.appendChild(div);
                            } else {
                                try {
                                    if (cachedMutualNotes[userUid]) {
                                        delete cachedMutualNotes[userUid];
                                        localStorage.setItem('mutual_notes_cache_' + user.uid, JSON.stringify(cachedMutualNotes));
                                    }
                                } catch(e){}
                            }
                        });
                    });
            });

        } catch (e) { console.error("Error loading notes:", e); }
    }
};

document.addEventListener('DOMContentLoaded', () => NotesManager.init());
