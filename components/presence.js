// components/presence.js

// 1. We remove the hardcoded imports and config to use the shared global instance
// This prevents "Firebase App named '[DEFAULT]' already exists" errors

let app, auth, firestore, rdb;

// 2. Initialize using the global core function (from config.js)
if (typeof window.initFirebaseCore === 'function') {
    window.initFirebaseCore();
    // Use the global instances created by config.js
    app = firebase.app(); // Get the default app
    auth = firebase.auth();
    firestore = firebase.firestore();
    rdb = firebase.database();
} else {
    // Fallback if config.js wasn't loaded (Safety net)
    // We use the compat libraries here to match the rest of your app's style
    if (!firebase.apps.length) {
        firebase.initializeApp({
            apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
            authDomain: "goorac-c3b59.firebaseapp.com",
            projectId: "goorac-c3b59",
            storageBucket: "goorac-c3b59.firebasestorage.app",
            messagingSenderId: "746746595332",
            appId: "1:746746595332:web:d3f8527d27fe8ca2530d51",
            measurementId: "G-M46FEVRYSS"
        });
    }
    app = firebase.app();
    auth = firebase.auth();
    firestore = firebase.firestore();
    rdb = firebase.database();
}

let presenceTimer;

auth.onAuthStateChanged((user) => {
    if (user) {
        const uid = user.uid;
        const userDocRef = firestore.collection("users").doc(uid);
        const statusRef = rdb.ref('/status/' + uid);
        const connectedRef = rdb.ref('.info/connected');

        const offlineState = { state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP };
        const onlineState = { state: 'online', last_changed: firebase.database.ServerValue.TIMESTAMP };

        userDocRef.onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const data = docSnap.data();
                
                // --- 1. SUSPENSION CHECK ---
                if (data.suspended === true) {
                    renderLockoutScreen();
                    statusRef.set(offlineState);
                    return; 
                } else {
                    const existingLock = document.getElementById('nexus-lockout');
                    if (existingLock) {
                        existingLock.remove();
                        document.body.style.overflow = 'auto';
                    }
                }

                // --- 1.5. SERVER ERROR CHECK ---
                if (data.serverError === true) {
                    renderServerErrorScreen();
                    statusRef.set(offlineState);
                    return; 
                } else {
                    const existingCrash = document.getElementById('quantum-server-crash');
                    if (existingCrash) {
                        existingCrash.remove();
                        document.body.style.overflow = 'auto';
                    }
                }

                // --- 2. INITIALIZE PREFERENCE ---
                if (data.showActivityStatus === undefined) {
                    userDocRef.update({ showActivityStatus: true });
                }

                const isActivityEnabled = data.showActivityStatus !== false;

                // --- 3. DYNAMIC PRESENCE ENGINE ---
                // FIX: Remove old listeners to prevent multiple timers running at once
                connectedRef.off(); 

                connectedRef.on('value', (snapshot) => {
                    if (snapshot.val() === false) return;

                    // ALWAYS clear existing timers first
                    clearTimeout(presenceTimer);

                    if (!isActivityEnabled) {
                        // FIX: If toggle is OFF, cancel all background hooks and force offline
                        statusRef.onDisconnect().cancel(); 
                        statusRef.set(offlineState);
                        return;
                    }

                    // --- 4. ZERO-FLICKER BUFFER ---
                    // "If I lose connection, tell the server I'm offline"
                    statusRef.onDisconnect().set(offlineState).then(() => {
                        // "If I'm still connected after 4 seconds, tell the server I'm online"
                        presenceTimer = setTimeout(() => {
                            // Final check before pushing online status
                            if (isActivityEnabled) {
                                statusRef.set(onlineState);
                            }
                        }, 4000);
                    });
                });
            }
        });
    }
});

// --- UI RENDERER (Preserved exactly as requested) ---
function renderLockoutScreen() {
    if (document.getElementById('nexus-lockout')) return;
    const overlay = document.createElement('div');
    overlay.id = 'nexus-lockout';
    overlay.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
            #nexus-lockout {
                position: fixed; inset: 0;
                background: rgba(10, 10, 12, 0.95);
                z-index: 9999999; display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', sans-serif; backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px); animation: fade-in 0.4s ease-out;
            }
            .nexus-lock-card {
                background: #1A1A1D; border: 1px solid #333;
                padding: 48px 40px; border-radius: 16px; text-align: center;
                max-width: 440px; width: 90%; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            }
            .nexus-icon {
                width: 64px; height: 64px; margin: 0 auto 24px auto; color: #64748B;
            }
            .nexus-title { color: #F8FAFC; font-size: 24px; font-weight: 600; margin-bottom: 12px; }
            .nexus-message { color: #94A3B8; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
            .nexus-support {
                background: #0F172A; padding: 20px; border-radius: 12px;
                color: #CBD5E1; font-size: 14px; line-height: 1.5; border: 1px solid #1E293B;
            }
            .nexus-support a { color: #38BDF8; text-decoration: none; font-weight: 500; display: inline-block; margin-top: 8px; transition: opacity 0.2s; }
            .nexus-support a:hover { opacity: 0.8; }
            @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        </style>
        <div class="nexus-lock-card">
            <svg class="nexus-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <h1 class="nexus-title">Account Suspended</h1>
            <p class="nexus-message">Your account was suspended due to a policy or security reason. You cannot use Goorac Quantum at this time.</p>
            <div class="nexus-support">
                To appeal this decision, please contact our support team.<br>
                <a href="mailto:support@goorac.biz">support@goorac.biz</a>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

function renderServerErrorScreen() {
    if (document.getElementById('quantum-server-crash')) return;
    const overlay = document.createElement('div');
    overlay.id = 'quantum-server-crash';
    overlay.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            #quantum-server-crash {
                position: fixed; inset: 0;
                background: rgba(0, 0, 0, 0.98);
                z-index: 9999999; display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', sans-serif; backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px); animation: pulse-bg 2s infinite alternate;
            }
            .server-crash-card {
                background: #0a0a0a; border: 1px solid #2a0808;
                padding: 50px 40px; border-radius: 20px; text-align: center;
                max-width: 460px; width: 90%; 
                box-shadow: 0 0 50px rgba(255, 51, 51, 0.1), inset 0 0 0 1px rgba(255, 51, 51, 0.2);
                position: relative; overflow: hidden;
            }
            .server-crash-card::before {
                content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
                background: linear-gradient(90deg, transparent, #ff3333, transparent);
            }
            .crash-icon-wrapper {
                width: 72px; height: 72px; margin: 0 auto 24px auto;
                background: rgba(255, 51, 51, 0.1); border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                border: 1px solid rgba(255, 51, 51, 0.2);
                animation: glitch-bounce 1.5s infinite;
            }
            .crash-icon { width: 36px; height: 36px; color: #ff4444; }
            .crash-title { color: #ffffff; font-size: 26px; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px; }
            .crash-subtitle { color: #ff4444; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px; }
            .crash-message { color: #888888; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
            .crash-details {
                background: #050505; padding: 16px; border-radius: 12px;
                color: #555555; font-size: 12px; font-family: monospace; text-align: left;
                border: 1px solid #111111;
            }
            .blink-cursor { animation: blink 1s step-end infinite; }
            @keyframes pulse-bg { from { background: rgba(5, 0, 0, 0.96); } to { background: rgba(15, 0, 0, 0.98); } }
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
            @keyframes glitch-bounce { 
                0%, 100% { transform: translateY(0); } 
                50% { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(255,51,51,0.2); } 
            }
        </style>
        <div class="server-crash-card">
            <div class="crash-icon-wrapper">
                <svg class="crash-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path>
                </svg>
            </div>
            <h1 class="crash-title">503 Service Unavailable</h1>
            <div class="crash-subtitle">Quantum Core Overload</div>
            <p class="crash-message">The Quantum servers are currently experiencing an unprecedented volume of users. We have temporarily restricted access to stabilize the network infrastructure.</p>
            <div class="crash-details">
                > STATUS: CRITICAL<br>
                > LOAD: 99.8% CAPACITY<br>
                > ACTION: QUEUING CONNECTIONS<span class="blink-cursor">_</span>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

// Export isn't strictly needed if loaded as a normal script, but kept for compatibility
// export { app, auth, firestore };exportxport
