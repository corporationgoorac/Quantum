class ShareBites extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.db = firebase.firestore();
        this.myUid = null;
        this.myUserData = null;
        this.mutualUIDs = []; // Added for mutual friends tracking
        this.chatsData = [];
        this.selectedChats = new Set();
        this.currentBite = null;
        this.userCache = JSON.parse(localStorage.getItem('goorac_u_cache')) || {};
        this.searchTimeout = null; // Added for debouncing global search

        this.shadowRoot.innerHTML = `
            <style>
                * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-tap-highlight-color: transparent; }
                
                #share-overlay {
                    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 10000;
                    backdrop-filter: blur(8px); display: none; opacity: 0; transition: opacity 0.3s ease;
                }
                
                #share-sheet {
                    position: fixed; bottom: -100%; left: 0; width: 100%; height: 65vh;
                    background: #121212; border-radius: 24px 24px 0 0; z-index: 10001;
                    display: flex; flex-direction: column; transition: bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    border-top: 1px solid rgba(255,255,255,0.1); box-shadow: 0 -10px 40px rgba(0,0,0,0.8);
                }

                .handle-bar { width: 40px; height: 5px; background: #444; border-radius: 10px; margin: 12px auto; }
                
                .header { padding: 0 20px 10px; display: flex; flex-direction: column; gap: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .search-input { width: 100%; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 14px; color: white; outline: none; font-size: 15px; transition: border-color 0.2s;}
                .search-input:focus { border-color: #00d2ff; background: #222; }

                /* Grid Layout for Contacts */
                .contacts-grid { 
                    flex: 1; overflow-y: auto; padding: 20px; 
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(75px, 1fr)); 
                    gap: 15px 10px; align-content: start;
                    padding-bottom: 120px; /* Space for the bottom bar */
                }
                
                .contact-item { 
                    display: flex; flex-direction: column; align-items: center; 
                    cursor: pointer; text-align: center; gap: 6px;
                }
                
                .avatar-wrap { position: relative; width: 60px; height: 60px; border-radius: 50%; }
                
                .avatar { 
                    width: 100%; height: 100%; border-radius: 50%; object-fit: cover; 
                    background: #222; border: 2px solid transparent; 
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                }
                
                .contact-name { color: #ccc; font-size: 0.75rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
                
                /* Selection Styles */
                .contact-item.selected .avatar { 
                    border-color: #00d2ff; 
                    padding: 2px; 
                    transform: scale(1.05);
                    box-shadow: 0 0 15px rgba(0, 210, 255, 0.4);
                }
                .contact-item.selected .contact-name { color: #fff; font-weight: 700; }
                
                .check-badge { 
                    position: absolute; bottom: -2px; right: -2px; 
                    background: #00d2ff; color: #000; width: 22px; height: 22px; 
                    border-radius: 50%; display: none; align-items: center; justify-content: center; 
                    border: 2px solid #121212; z-index: 2;
                }
                .check-badge svg { width: 14px; height: 14px; fill: currentColor; }
                .contact-item.selected .check-badge { display: flex; animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

                @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }

                /* --- BOTTOM ACTION BAR (DUAL STATE) --- */
                .bottom-action-container {
                    position: absolute; bottom: 0; left: 0; width: 100%; 
                    padding: 15px 20px calc(15px + env(safe-area-inset-bottom));
                    background: linear-gradient(to top, rgba(18,18,18,0.95) 70%, transparent);
                    display: flex; flex-direction: column; overflow: hidden;
                }

                /* State 1: Global Actions (Add to Drops / Copy Link) */
                .global-actions {
                    display: flex; gap: 15px; width: 100%;
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
                }
                .global-actions.hidden {
                    transform: translateY(100%); opacity: 0; pointer-events: none; position: absolute;
                }
                
                .action-btn {
                    flex: 1; background: #1a1a1a; color: #fff; border: 1px solid rgba(255,255,255,0.1); 
                    padding: 14px; border-radius: 16px; font-weight: 700; font-size: 0.95rem; 
                    cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
                }
                .action-btn:active { transform: scale(0.96); background: #222; }
                .action-btn svg { width: 20px; height: 20px; fill: currentColor; }
                
                .btn-drops { background: rgba(0, 210, 255, 0.1); border-color: rgba(0, 210, 255, 0.3); color: #00d2ff; }

                /* State 2: Send to Friends */
                .send-action {
                    width: 100%;
                    transform: translateY(100%); opacity: 0; position: absolute; pointer-events: none;
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
                }
                .send-action.visible {
                    transform: translateY(0); opacity: 1; position: relative; pointer-events: auto;
                }

                .send-btn { 
                    width: 100%; background: #00d2ff; color: #000; border: none; 
                    padding: 16px; border-radius: 16px; font-weight: 800; font-size: 1.05rem; 
                    cursor: pointer; transition: transform 0.2s; 
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3);
                }
                .send-btn:active { transform: scale(0.97); }
                .send-btn svg { width: 20px; height: 20px; fill: currentColor; }

                .loader-text { grid-column: 1 / -1; text-align: center; color: #666; padding: 40px 0; font-size: 0.9rem; }
            </style>

            <div id="share-overlay"></div>
            <div id="share-sheet">
                <div class="handle-bar"></div>
                <div class="header">
                    <input type="text" class="search-input" id="search-input" placeholder="Search friends & groups..." autocomplete="off">
                </div>
                
                <div class="contacts-grid" id="contacts-grid">
                    <div class="loader-text">Loading contacts...</div>
                </div>

                <div class="bottom-action-container">
                    <div class="global-actions" id="global-actions">
                        <button class="action-btn btn-drops" id="add-drops-btn">
                            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
                            Add to Drops
                        </button>
                        <button class="action-btn" id="copy-link-btn">
                            <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                            Copy Link
                        </button>
                    </div>

                    <div class="send-action" id="send-action">
                        <button class="send-btn" id="send-btn">
                            Send <span id="send-count"></span>
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Base Event Listeners
        this.shadowRoot.getElementById('share-overlay').addEventListener('click', () => this.close(true));
        this.shadowRoot.getElementById('search-input').addEventListener('input', (e) => this.filterChats(e.target.value));
        this.shadowRoot.getElementById('send-btn').addEventListener('click', () => this.executeSend());
        
        // Global Action Event Listeners
        this.shadowRoot.getElementById('add-drops-btn').addEventListener('click', () => this.addToDrops());
        this.shadowRoot.getElementById('copy-link-btn').addEventListener('click', () => this.copyLink());

        this.popStateHandler = (e) => {
            if (this.isOpen && (!e.state || e.state.modal !== 'shareBite')) {
                this.close(false); 
            }
        };
        window.addEventListener('popstate', this.popStateHandler);
    }

    async connectedCallback() {
        firebase.auth().onAuthStateChanged(async user => {
            if (user) {
                this.myUid = user.uid;
                const doc = await this.db.collection("users").doc(this.myUid).get();
                if (doc.exists) {
                    this.myUserData = doc.data();
                    
                    // --- MUTUAL FRIENDS CALCULATION ---
                    const followingUIDs = (this.myUserData.following || []).map(i => typeof i === 'string' ? i : i.uid);
                    const followersUIDs = (this.myUserData.followers || []).map(i => typeof i === 'string' ? i : i.uid);
                    this.mutualUIDs = followingUIDs.filter(uid => followersUIDs.includes(uid));
                }
            }
        });
    }

    disconnectedCallback() {
        window.removeEventListener('popstate', this.popStateHandler);
    }

    open(biteData) {
        if (!this.myUid) return alert("Please log in to share.");
        this.currentBite = biteData;
        this.isOpen = true;
        this.selectedChats.clear();
        this.updateSendButton();
        this.shadowRoot.getElementById('search-input').value = "";

        history.pushState({ modal: 'shareBite' }, "", "#share");

        this.shadowRoot.getElementById('share-overlay').style.display = 'block';
        setTimeout(() => {
            this.shadowRoot.getElementById('share-overlay').style.opacity = '1';
            this.shadowRoot.getElementById('share-sheet').style.bottom = '0';
        }, 10);

        this.loadRecentChats();
    }

    close(triggerBack = true) {
        this.isOpen = false;
        this.shadowRoot.getElementById('share-sheet').style.bottom = '-100%';
        this.shadowRoot.getElementById('share-overlay').style.opacity = '0';
        
        setTimeout(() => {
            this.shadowRoot.getElementById('share-overlay').style.display = 'none';
            // Reset copy button visual state just in case
            const copyBtn = this.shadowRoot.getElementById('copy-link-btn');
            copyBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy Link`;
        }, 400);

        if (triggerBack && window.location.hash === "#share") {
            history.back();
        }
    }

    // --- GLOBAL ACTIONS ---
    addToDrops() {
        if (!this.currentBite || !this.currentBite.videoId) return;
        if (navigator.vibrate) navigator.vibrate(15);
        // Uses the routing architecture established in drops.html
        window.location.href = `drops.html?v=${this.currentBite.videoId}`;
    }

    copyLink() {
        if (!this.currentBite || !this.currentBite.videoId) return;
        if (navigator.vibrate) navigator.vibrate(10);
        
        const url = `https://www.goorac.biz/bites.html?v=${this.currentBite.videoId}`;
        const btn = this.shadowRoot.getElementById('copy-link-btn');
        
        navigator.clipboard.writeText(url).then(() => {
            btn.innerHTML = `<span class="material-icons-round" style="font-family: 'Material Icons Round'; font-size:18px;">check</span> Copied!`;
            btn.style.background = "#32D74B";
            btn.style.borderColor = "#32D74B";
            btn.style.color = "#fff";
            
            setTimeout(() => {
                btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy Link`;
                btn.style.background = "#1a1a1a";
                btn.style.borderColor = "rgba(255,255,255,0.1)";
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy link.');
        });
    }

    // --- CONTACTS LOGIC ---
    async loadRecentChats() {
        try {
            // Fetch recent chats to preserve groups and sorting
            const snap = await this.db.collection("chats")
                .where("participants", "array-contains", this.myUid)
                .orderBy("lastTimestamp", "desc")
                .limit(30)
                .get();

            let rawChats = [];
            let addedUids = new Set(); // Track UIDs already added via recent chats

            for (let d of snap.docs) {
                let chat = d.data();
                chat.id = d.id;
                
                if (chat.isGroup) {
                    chat.displayName = chat.groupName;
                    chat.displayPic = chat.groupPhoto || "https://via.placeholder.com/150";
                    rawChats.push(chat);
                } else {
                    const otherUid = chat.participants.find(id => id !== this.myUid);
                    let otherUser = null;
                    
                    // Force fetching from DB to ensure real-time profile picture accuracy
                    const uSnap = await this.db.collection("users").doc(otherUid).get();
                    if (uSnap.exists) {
                        otherUser = uSnap.data();
                        this.userCache[otherUid] = otherUser; // Update cache with fresh data
                    } else if (this.userCache[otherUid]) {
                        otherUser = this.userCache[otherUid]; // Fallback to cache
                    }
                    
                    if (otherUser) {
                        chat.displayName = otherUser.name || otherUser.username;
                        chat.displayPic = otherUser.photoURL || "https://via.placeholder.com/150";
                        rawChats.push(chat);
                        addedUids.add(otherUid);
                    }
                }
            }

            // --- INJECT ALL MUTUAL FRIENDS ---
            if (this.mutualUIDs && this.mutualUIDs.length > 0) {
                const missingUids = this.mutualUIDs.filter(uid => !addedUids.has(uid));
                
                for (let uid of missingUids) {
                    let userObj = null;
                    
                    // Force fetching from DB for real-time accuracy for mutuals too
                    const uSnap = await this.db.collection("users").doc(uid).get();
                    if (uSnap.exists) {
                        userObj = uSnap.data();
                        this.userCache[uid] = userObj; // Update cache with fresh data
                    } else if (this.userCache[uid]) {
                        userObj = this.userCache[uid]; // Fallback
                    }
                    
                    if (userObj) {
                        // Generate the standard Firebase 1-on-1 chat ID format
                        const generatedChatId = this.myUid < uid ? `${this.myUid}_${uid}` : `${uid}_${this.myUid}`;
                        
                        rawChats.push({
                            id: generatedChatId,
                            isGroup: false,
                            displayName: userObj.name || userObj.username || "User",
                            displayPic: userObj.photoURL || "https://via.placeholder.com/150",
                            participants: [this.myUid, uid],
                            lastTimestamp: { toMillis: () => 0 } // Push to bottom of list
                        });
                    }
                }
            }

            // Save the newly refreshed real-time profile pics to localStorage cache
            localStorage.setItem('goorac_u_cache', JSON.stringify(this.userCache));

            // Sort by share frequency and recent timestamp
            const shareFreq = JSON.parse(localStorage.getItem('goorac_share_freq') || '{}');
            rawChats.sort((a, b) => {
                const freqA = shareFreq[a.id] || 0;
                const freqB = shareFreq[b.id] || 0;
                if (freqB !== freqA) return freqB - freqA;
                const timeA = a.lastTimestamp?.toMillis ? a.lastTimestamp.toMillis() : 0;
                const timeB = b.lastTimestamp?.toMillis ? b.lastTimestamp.toMillis() : 0;
                return timeB - timeA;
            });

            this.chatsData = rawChats;
            this.renderGrid(this.chatsData);

        } catch (error) {
            console.error("Error loading contacts:", error);
            this.shadowRoot.getElementById('contacts-grid').innerHTML = `<div class="loader-text" style="color:#ff4444;">Failed to load contacts.</div>`;
        }
    }

    renderGrid(chats) {
        const grid = this.shadowRoot.getElementById('contacts-grid');
        grid.innerHTML = "";
        
        if (chats.length === 0) {
            grid.innerHTML = `<div class="loader-text">No contacts found.</div>`;
            return;
        }

        chats.forEach(chat => {
            const isSelected = this.selectedChats.has(chat.id);
            const item = document.createElement('div');
            item.className = `contact-item ${isSelected ? 'selected' : ''}`;
            item.innerHTML = `
                <div class="avatar-wrap">
                    <img src="${chat.displayPic}" class="avatar">
                    <div class="check-badge">
                        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </div>
                </div>
                <div class="contact-name">${chat.displayName.split(' ')[0]}</div>
            `;
            
            item.addEventListener('click', () => {
                if (navigator.vibrate) navigator.vibrate(20);
                if (this.selectedChats.has(chat.id)) {
                    this.selectedChats.delete(chat.id);
                    item.classList.remove('selected');
                } else {
                    this.selectedChats.add(chat.id);
                    item.classList.add('selected');
                }
                this.updateSendButton();
            });
            grid.appendChild(item);
        });
    }

    async filterChats(query) {
        const q = query.toLowerCase().trim();
        
        // 1. Immediately filter and show local results (Zero extra reads)
        let filtered = this.chatsData.filter(c => c.displayName.toLowerCase().includes(q));
        this.renderGrid(filtered);

        // If the search bar is cleared, just show the local grid and stop.
        if (!q) return;

        // 2. Perform a debounced Global Search to find users outside existing chats/mutuals
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        
        // Wait 400ms after user stops typing to trigger DB read
        this.searchTimeout = setTimeout(async () => {
            try {
                // Query DB. Limited to 10 to drastically reduce read counts
                const snap = await this.db.collection('users')
                    .where('username', '>=', q)
                    .where('username', '<=', q + '\uf8ff')
                    .limit(10)
                    .get();
                
                let globalResults = [];
                
                snap.forEach(doc => {
                    if (doc.id === this.myUid) return; // Don't show yourself
                    let u = doc.data();
                    
                    // Prevent showing duplicates if they were already in the local "filtered" array
                    const alreadyShown = filtered.find(c => c.participants && c.participants.includes(doc.id));
                    
                    if (!alreadyShown) {
                        const generatedChatId = this.myUid < doc.id ? `${this.myUid}_${doc.id}` : `${doc.id}_${this.myUid}`;
                        globalResults.push({
                            id: generatedChatId,
                            isGroup: false,
                            displayName: u.name || u.username || "User",
                            displayPic: u.photoURL || "https://via.placeholder.com/150",
                            participants: [this.myUid, doc.id],
                            lastTimestamp: { toMillis: () => 0 } 
                        });
                        
                        // Update cache with fresh global search data
                        this.userCache[doc.id] = u;
                    }
                });

                // Merge and render if global results were found
                if (globalResults.length > 0) {
                    filtered = [...filtered, ...globalResults];
                    this.renderGrid(filtered);
                    localStorage.setItem('goorac_u_cache', JSON.stringify(this.userCache));
                }

            } catch (error) {
                console.error("Global search error:", error);
            }
        }, 400); 
    }

    updateSendButton() {
        const globalActions = this.shadowRoot.getElementById('global-actions');
        const sendAction = this.shadowRoot.getElementById('send-action');
        const countSpan = this.shadowRoot.getElementById('send-count');
        
        if (this.selectedChats.size > 0) {
            // Hide global, show send
            globalActions.classList.add('hidden');
            sendAction.classList.add('visible');
            countSpan.innerText = `(${this.selectedChats.size})`;
        } else {
            // Show global, hide send
            globalActions.classList.remove('hidden');
            sendAction.classList.remove('visible');
        }
    }

    async executeSend() {
        if (this.selectedChats.size === 0) return;
        
        const btn = this.shadowRoot.getElementById('send-btn');
        btn.innerHTML = `Sending...`;
        btn.style.pointerEvents = 'none';

        const shareFreq = JSON.parse(localStorage.getItem('goorac_share_freq') || '{}');

        const sendPromises = Array.from(this.selectedChats).map(async (chatId) => {
            const chat = this.chatsData.find(c => c.id === chatId) || { id: chatId, participants: chatId.split('_') }; 
            // Note: Added fallback for global searched users who aren't in this.chatsData yet
            if (!chat) return;

            shareFreq[chatId] = (shareFreq[chatId] || 0) + 1;

            const biteMsg = {
                text: "",
                sender: this.myUid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                seen: false,
                reactions: {},
                isBite: true,
                biteId: this.currentBite.videoId,
                biteTitle: this.currentBite.title,
                biteAuthor: this.currentBite.author,
                biteImgUrl: this.currentBite.imgUrl
            };

            let unreadUpdates = {};
            chat.participants.forEach(uid => {
                if (uid !== this.myUid) unreadUpdates[`unreadCount.${uid}`] = firebase.firestore.FieldValue.increment(1);
            });

            // Using .set() with { merge: true } so we don't error out if chat document is brand new!
            await this.db.collection("chats").doc(chat.id).set({
                lastMessage: "🎬 Shared a Bite",
                lastSender: this.myUid,
                lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                seen: false,
                participants: chat.participants, // ensures participants array exists on new docs
                ...unreadUpdates
            }, { merge: true });

            await this.db.collection("chats").doc(chat.id).collection("messages").add(biteMsg);

            const senderName = this.myUserData ? this.myUserData.name : "Someone";
            const senderPhoto = this.myUserData ? this.myUserData.photoURL : "https://www.goorac.biz/icon.png";
            
            chat.participants.forEach(targetUid => {
                if (targetUid !== this.myUid) {
                    const linkUserParam = (this.myUserData && this.myUserData.username) ? this.myUserData.username : this.myUid;
                    const deepLink = chat.isGroup ? 
                        `https://www.goorac.biz/groupChat.html?id=${chat.id}` : 
                        `https://www.goorac.biz/chat.html?user=${linkUserParam}`;

                    fetch("https://pish-uigm.onrender.com/send-push", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            targetUid: targetUid,
                            senderUid: this.myUid,
                            title: chat.isGroup ? `${senderName} in ${chat.displayName}` : senderName,
                            body: "🎬 Shared a Bite",
                            icon: senderPhoto,
                            click_action: deepLink
                        })
                    }).catch(e => {}); 
                }
            });
        });

        try {
            await Promise.all(sendPromises);
            localStorage.setItem('goorac_share_freq', JSON.stringify(shareFreq));

            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            btn.style.background = "#32D74B"; 
            btn.style.color = "#fff";
            btn.innerHTML = `Sent! <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
            
            setTimeout(() => {
                this.close(true);
                setTimeout(() => {
                    btn.style.background = "#00d2ff";
                    btn.style.color = "#000";
                    btn.style.pointerEvents = 'auto';
                }, 500);
            }, 800);

        } catch (error) {
            console.error("Failed batch send:", error);
            btn.innerHTML = `Failed. Try again.`;
            btn.style.background = "#ff4444";
            btn.style.color = "#fff";
            setTimeout(() => {
                btn.style.background = "#00d2ff";
                btn.style.color = "#000";
                btn.style.pointerEvents = 'auto';
                btn.innerHTML = `Send <span id="send-count">(${this.selectedChats.size})</span>`;
            }, 2000);
        }
    }
}

customElements.define('share-bites', ShareBites);
