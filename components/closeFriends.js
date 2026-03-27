class CloseFriendsSelector extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // State
        this.isOpen = false;
        this.myUid = null;
        
        // Data Handling
        this.mutualIDs = [];       // Array of UIDs (Intersection of Following & Followers)
        this.selectedIDs = new Set(); // UIDs currently selected as Close Friends
        this.loadedCount = 0;      // Cursor for pagination
        this.isSearching = false;  // Toggle between batch list and search mode
        this.isLoading = false;
        
        // Constants
        this.BATCH_SIZE = 10;
        
        // References
        this.container = null;
        this.listContainer = null;
        this.sentinel = null;
        this.saveBtn = null;
    }

    connectedCallback() {
        this.render();
        this.initFirebase();
        this.setupEvents();
    }

    initFirebase() {
        // Rely on global config.js variables
        if (window.db && window.auth) {
            this.db = window.db;
            this.auth = window.auth;
        } else if (typeof firebase !== 'undefined') {
            this.db = firebase.firestore();
            this.auth = firebase.auth();
        } else {
            console.error("Critical: Firebase config not found.");
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host {
                /* --- INTEGRATED WITH THEME.JS --- */
                --bg-color: var(--bg, #000000);
                --surface-color: var(--surface, #121212);
                --accent-color: var(--accent, #00d2ff);
                --text-primary: var(--text-main, #ffffff);
                --text-secondary: var(--text-dim, #888888);
                --border-color: var(--border-color, #2a2a2a);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            /* --- SLIDE OVERLAY --- */
            .cf-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: var(--bg-color); z-index: 100000;
                display: flex; flex-direction: column;
                transform: translateX(100%); 
                transition: transform 0.35s cubic-bezier(0.2, 1, 0.3, 1);
            }
            .cf-overlay.open { transform: translateX(0); }

            /* --- HEADER (THEMED) --- */
            .cf-header {
                padding: 15px 15px 10px;
                background: var(--bg-transparent, var(--bg-color)); /* PURE BLACK OVERRIDDEN BY THEME */
                backdrop-filter: blur(12px); /* ADDED FOR THEME FROSTED GLASS */
                -webkit-backdrop-filter: blur(12px);
                border-bottom: 1px solid var(--border-color);
                z-index: 10; display: flex; flex-direction: column; gap: 15px;
                padding-top: max(15px, env(safe-area-inset-top));
            }

            .cf-nav { display: flex; justify-content: space-between; align-items: center; }
            .cf-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); letter-spacing: 0.5px; }
            
            .cf-btn-icon {
                background: transparent; border: none; color: var(--text-primary);
                width: 40px; height: 40px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: background 0.2s;
            }
            .cf-btn-icon:active { background: rgba(255,255,255,0.1); }
            
            .cf-save-btn {
                background: var(--accent-color); color: #fff; /* Updated to white to match theme */
                border: none; padding: 8px 18px; border-radius: 100px;
                font-weight: 700; font-size: 0.9rem; cursor: pointer;
                transition: transform 0.1s, opacity 0.2s; box-shadow: 0 4px 15px rgba(0, 149, 246, 0.2);
            }
            .cf-save-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
            .cf-save-btn:active { transform: scale(0.95); }

            /* --- SEARCH --- */
            .cf-search-box {
                background: var(--surface-color); border-radius: 12px;
                display: flex; align-items: center; padding: 0 12px;
                border: 1px solid var(--border-color);
                transition: border-color 0.2s;
            }
            .cf-search-box:focus-within { border-color: var(--accent-color); }

            .cf-search-input {
                flex: 1; background: transparent; border: none;
                padding: 12px 8px; color: var(--text-primary);
                font-size: 1rem; outline: none;
            }
            .cf-search-input::placeholder { color: var(--text-secondary); }

            /* --- LIST --- */
            .cf-list {
                flex: 1; overflow-y: auto; padding: 10px 0;
                display: flex; flex-direction: column;
                padding-bottom: 50px;
            }
            .cf-item {
                display: flex; align-items: center; gap: 14px;
                padding: 12px 20px; cursor: pointer;
                transition: background 0.2s;
            }
            .cf-item:active { background: rgba(255,255,255,0.05); }

            .cf-pfp {
                width: 48px; height: 48px; border-radius: 50%;
                background: var(--surface-color); object-fit: cover;
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .cf-info { flex: 1; display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
            .cf-name-row { display: flex; align-items: center; gap: 5px; }
            .cf-name { font-weight: 600; font-size: 1rem; color: var(--text-primary); white-space: nowrap; overflow:hidden; text-overflow:ellipsis; }
            .cf-username { font-size: 0.85rem; color: var(--text-secondary); }
            
            /* --- BADGES --- */
            .cf-verified {
                width: 18px; height: 18px; 
                fill: var(--accent-color);
                display: inline-block;
                vertical-align: middle;
            }

            /* --- CHECKBOX (Custom) --- */
            .cf-checkbox {
                width: 24px; height: 24px; border-radius: 50%;
                border: 2px solid var(--border-color); display: flex;
                align-items: center; justify-content: center;
                transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .cf-item.selected .cf-checkbox {
                background: var(--accent-color); border-color: var(--accent-color);
                transform: scale(1.1);
            }
            .cf-checkbox svg { width: 16px; fill: #000; opacity: 0; transform: scale(0.5); transition: 0.2s; }
            .cf-item.selected .cf-checkbox svg { opacity: 1; transform: scale(1); }

            /* --- UTILS --- */
            .cf-msg { padding: 40px 20px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; }
            .hidden { display: none !important; }
            svg { width: 24px; height: 24px; fill: currentColor; }
            
            /* Loading Spinner */
            .loader { width: 24px; height: 24px; border: 3px solid var(--border-color); border-top-color: var(--accent-color); border-radius: 50%; margin: 20px auto; animation: spin 1s infinite linear; }
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>

        <div class="cf-overlay" id="overlay">
            <div class="cf-header">
                <div class="cf-nav">
                    <button class="cf-btn-icon" id="btn-back">
                        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </button>
                    <span class="cf-title">Close Friends</span>
                    <button class="cf-save-btn" id="btn-save">Done</button>
                </div>
                <div class="cf-search-box">
                    <svg viewBox="0 0 24 24" style="width:20px; color:var(--text-secondary);"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    <input type="text" class="cf-search-input" id="search-input" placeholder="Search mutual friends..." autocomplete="off" autocapitalize="off">
                </div>
            </div>

            <div class="cf-list" id="user-list">
                </div>
            
            <div id="loader" class="loader hidden"></div>
            <div id="sentinel"></div>
        </div>
        `;

        this.container = this.shadowRoot.getElementById('overlay');
        this.listContainer = this.shadowRoot.getElementById('user-list');
        this.sentinel = this.shadowRoot.getElementById('sentinel');
        this.saveBtn = this.shadowRoot.getElementById('btn-save');
    }

    setupEvents() {
        this.shadowRoot.getElementById('btn-back').onclick = () => this.close();
        this.saveBtn.onclick = () => this.saveChanges();

        // 1. Mobile Back Button Support (History API)
        window.addEventListener('popstate', (event) => {
            if (this.isOpen) {
                this.close(true);
            }
        });

        // 2. Search Logic (Debounced)
        let searchTimer;
        const searchInput = this.shadowRoot.getElementById('search-input');
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            const val = e.target.value.trim();
            
            searchTimer = setTimeout(() => {
                this.handleSearch(val);
            }, 500);
        });

        // 3. Infinite Scroll (10 by 10)
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading && !this.isSearching) {
                this.renderBatch(); // Load next 10
            }
        }, { threshold: 0.1 });
        
        observer.observe(this.sentinel);
    }

    // --- MAIN LOGIC ---

    async open() {
        if (!this.auth.currentUser) return;
        this.myUid = this.auth.currentUser.uid;
        
        this.isOpen = true;
        this.container.classList.add('open');
        
        // Lock body scroll to prevent parent scrolling
        document.body.style.overflow = 'hidden';
        
        // Push state for mobile back button
        window.history.pushState({ cfOpen: true }, "");

        // Reset State
        this.listContainer.innerHTML = '';
        this.mutualIDs = [];
        this.selectedIDs.clear();
        this.loadedCount = 0;
        this.isSearching = false;
        this.shadowRoot.getElementById('search-input').value = '';
        
        await this.initializeData();
    }

    close(fromHistory = false) {
        this.isOpen = false;
        this.container.classList.remove('open');
        
        // Unlock body scroll
        document.body.style.overflow = '';
        
        if (!fromHistory && history.state && history.state.cfOpen) {
            history.back();
        }
    }

    async initializeData() {
        this.toggleLoader(true);
        try {
            // 1. Fetch My Profile (Close Friends, Following, Followers)
            const doc = await this.db.collection('users').doc(this.myUid).get();
            const data = doc.data() || {};

            // 2. Set currently selected close friends
            if (data.closeFriends && Array.isArray(data.closeFriends)) {
                data.closeFriends.forEach(uid => this.selectedIDs.add(uid));
            }

            // 3. CALCULATE MUTUALS
            // Logic: I follow them AND They follow me.
            const following = this.normalizeList(data.following);
            const followers = this.normalizeList(data.followers);
            
            // Intersection
            this.mutualIDs = following.filter(uid => followers.includes(uid));

            // SORT: Selected friends at the TOP
            this.mutualIDs.sort((a, b) => {
                const isSelectedA = this.selectedIDs.has(a);
                const isSelectedB = this.selectedIDs.has(b);
                // If A is selected and B is not, A comes first (-1)
                // If B is selected and A is not, B comes first (1)
                // If both same, keep original order (0)
                if (isSelectedA && !isSelectedB) return -1;
                if (!isSelectedA && isSelectedB) return 1;
                return 0;
            });

            if (this.mutualIDs.length === 0) {
                this.listContainer.innerHTML = `<div class="cf-msg">No mutual friends found.<br><span style="font-size:0.8em; opacity:0.7">Follow people who follow you back to add them here.</span></div>`;
                this.toggleLoader(false);
                return;
            }

            // 4. Render first batch
            await this.renderBatch();

        } catch (e) {
            console.error("CF Init Error:", e);
            this.listContainer.innerHTML = `<div class="cf-msg" style="color:#ff4444">Error loading friends.</div>`;
        }
        this.toggleLoader(false);
    }

    // Standardize list to array of UIDs (handles old data structure if objects were used)
    normalizeList(list) {
        if (!list) return [];
        return list.map(item => (typeof item === 'object' ? item.uid : item));
    }

    // --- PAGINATION & SEARCH ---

    async renderBatch() {
        if (this.loadedCount >= this.mutualIDs.length) return; // End of list
        this.toggleLoader(true);

        // Slice next 10 IDs
        const nextBatchIDs = this.mutualIDs.slice(this.loadedCount, this.loadedCount + this.BATCH_SIZE);
        
        if (nextBatchIDs.length > 0) {
            try {
                // Fetch profiles for these 10 IDs
                // Note: Firestore 'in' query supports up to 10 items. Perfect for batching.
                const snapshot = await this.db.collection('users')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', nextBatchIDs)
                    .get();

                // Sort properly (Firestore 'in' query doesn't guarantee order)
                const docsMap = new Map();
                snapshot.forEach(doc => docsMap.set(doc.id, doc.data()));

                nextBatchIDs.forEach(uid => {
                    if (docsMap.has(uid)) {
                        this.createRow(uid, docsMap.get(uid));
                    }
                });

                this.loadedCount += nextBatchIDs.length;

            } catch (e) {
                console.error("Batch load error:", e);
            }
        }
        
        this.toggleLoader(false);
    }

    // Search is complex because we only want to search WITHIN mutuals.
    // Efficient strategy: Query users by name, but client-side filter against this.mutualIDs
    async handleSearch(query) {
        this.listContainer.innerHTML = '';
        
        if (!query) {
            this.isSearching = false;
            this.loadedCount = 0;
            this.renderBatch(); // Return to normal list
            return;
        }

        this.isSearching = true;
        this.toggleLoader(true);

        try {
            // Firestore prefix search
            // Note: This relies on 'username' field existing and being indexed.
            const end = query + '\uf8ff';
            const snapshot = await this.db.collection('users')
                .orderBy('username')
                .startAt(query)
                .endAt(end)
                .limit(20) // Limit global search to 20
                .get();

            let found = 0;
            snapshot.forEach(doc => {
                // SECURITY/LOGIC CHECK: Only show if they are in my Mutuals list
                if (this.mutualIDs.includes(doc.id)) {
                    this.createRow(doc.id, doc.data());
                    found++;
                }
            });

            if (found === 0) {
                this.listContainer.innerHTML = `<div class="cf-msg">No mutual friend found named "${query}"</div>`;
            }

        } catch (e) {
            console.error("Search Error:", e);
            this.listContainer.innerHTML = `<div class="cf-msg" style="font-size:0.8rem">Search failed (Check index)</div>`;
        }
        this.toggleLoader(false);
    }

    // --- UI HELPERS ---

    createRow(uid, data) {
        const row = document.createElement('div');
        const isSelected = this.selectedIDs.has(uid);
        row.className = `cf-item ${isSelected ? 'selected' : ''}`;
        
        const pfp = data.photoURL || 'https://via.placeholder.com/150';
        const name = data.name || 'User';
        const username = data.username || 'unknown';
        
        // Professional Material Badge (SVG)
        const badge = data.verified 
            ? `<svg class="cf-verified" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>` 
            : '';

        row.innerHTML = `
            <img src="${pfp}" class="cf-pfp">
            <div class="cf-info">
                <div class="cf-name-row">
                    <span class="cf-name">${name}</span>
                    ${badge}
                </div>
                <div class="cf-username">@${username}</div>
            </div>
            <div class="cf-checkbox">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
        `;

        row.onclick = () => {
            if (this.selectedIDs.has(uid)) {
                this.selectedIDs.delete(uid);
                row.classList.remove('selected');
            } else {
                this.selectedIDs.add(uid);
                row.classList.add('selected');
            }
            if(navigator.vibrate) navigator.vibrate(10);
        };

        this.listContainer.appendChild(row);
    }

    toggleLoader(show) {
        const l = this.shadowRoot.getElementById('loader');
        if (show) l.classList.remove('hidden');
        else l.classList.add('hidden');
    }

    // --- SAVING ---

    async saveChanges() {
        if(this.isLoading) return;
        this.saveBtn.textContent = "Saving...";
        this.saveBtn.disabled = true;

        try {
            const finalList = Array.from(this.selectedIDs);
            
            // Store directly in 'users' collection array
            await this.db.collection('users').doc(this.myUid).update({
                closeFriends: finalList
            });

            this.saveBtn.textContent = "Saved";
            
            setTimeout(() => {
                this.close();
                this.saveBtn.textContent = "Done";
                this.saveBtn.disabled = false;
            }, 600);

        } catch (e) {
            console.error("Save Failed:", e);
            this.saveBtn.textContent = "Error";
            setTimeout(() => {
                this.saveBtn.textContent = "Done";
                this.saveBtn.disabled = false;
            }, 1000);
        }
    }
}

customElements.define('close-friends-selector', CloseFriendsSelector);
