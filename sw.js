const CACHE_NAME = 'goorac-quantum-v56'; // Bumped version to force cache update immediately
const ASSETS = [
    '/',
    '/aboutGroup.html',
    '/admin.html',
    '/ai.html',
    '/bites.html',
    '/calls.html',
    '/chat.html',
    '/config.js',
    '/download.html',
    '/drops.html',
    '/explore.html',
    '/favicon.ico',
    '/followers.html',
    '/following.html',
    '/groupChat.html',
    '/home.html',
    '/index.html',
    '/login.html',
    '/manifest.json',
    '/messages.html',
    '/moments.html',
    '/notes.html',
    '/notifications.html',
    '/profile.html',
    '/pulse.html',
    '/pulseLobby.html',
    '/setup.html',
    '/share.html', // Essential: Keeps the share target cached
    '/userProfile.html',
    '/vision.html',
    '/visionLobby.html',
    '/notification-worker.js',
    'https://cdn-icons-png.flaticon.com/128/3067/3067451.png',
    'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
    '/components/call-notifier.js',
    '/components/chatLoader.js',
    '/components/chatTheme.js',
    '/components/closeFriends.js',
    '/components/emojiPicker.js',
    '/components/filePicker.js',
    '/components/fullSongPicker.js',
    '/components/gifPicker.js',
    '/components/imagePicker.js',
    '/components/keywords.js',
    '/components/navbar.js',
    '/components/presence.js',
    '/components/profileMoments.js',
    '/components/profileNotes.js',
    '/components/shareBites.js',
    '/components/songPicker.js',
    '/components/theme.js',
    '/components/viewDrops.js',
    '/components/viewMedia.js',
    '/components/viewMoments.js',
    '/components/viewNotes.js'
];

// 1. Install (Cache Files)
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(c => {
        return Promise.all(ASSETS.map(url => c.add(url).catch(console.warn)));
    }));
});

// 2. Activate (Clean old caches)
self.addEventListener('activate', (e) => {
    e.waitUntil(
        Promise.all([
            self.clients.claim(), 
            caches.keys().then(keys => {
                return Promise.all(
                    keys.map(key => {
                        if (key !== CACHE_NAME) {
                            return caches.delete(key);
                        }
                    })
                );
            })
        ])
    );
});

// 3. Fetch (The Hugging Face Shield & Offline Fallback)
self.addEventListener('fetch', (e) => {
    
    // ========================================================================
    // 🛡️ THE SHIELD: INTERCEPT POST REQUESTS BEFORE GITHUB PAGES THROWS 405
    // ========================================================================
    if (e.request.method === 'POST' && e.request.url.includes('/share.html')) {
        e.respondWith((async () => {
            try {
                // 1. Catch the file from the Android Gallery
                const formData = await e.request.formData();

                // 2. Secretly forward it to your Hugging Face Server in the background
                const hfResponse = await fetch('https://corporationgoorac-quantumbackend.hf.space/share/receiver', {
                    method: 'POST',
                    body: formData,
                    redirect: 'follow' // Automatically follows Hugging Face's 303 Redirect
                });

                // 3. Because 'follow' is true, hfResponse.url now contains the final 
                // destination string from Hugging Face (including the ?tempId=... )
                // We force the browser to navigate there safely using a GET request.
                return Response.redirect(hfResponse.url, 303);

            } catch (error) {
                console.error("SW Relay Error:", error);
                return Response.redirect('/share.html?error=relay_failed', 303);
            }
        })());
        return; 
    }
    // ========================================================================

    // Only intercept standard GET requests
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((cachedResponse) => {
            
            // Kick off a background network request to fetch the freshest data
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    if (networkResponse.ok) {
                        cache.put(e.request, networkResponse.clone());
                    }
                });
                return networkResponse;
            }).catch(() => {
                if (e.request.mode === 'navigate') {
                    return caches.match('/home.html');
                }
            });

            return cachedResponse || fetchPromise;
        })
    );
});

// 4. Notification Click
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = e.notification.data?.url || '/home.html';
    e.waitUntil(clients.openWindow(url));
});
