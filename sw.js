const CACHE_NAME = 'goorac-quantum-v57'; // Bumped version to force cache update
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
    '/share.html',
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

// 2. Activate (Clean old caches) - FIXED
self.addEventListener('activate', (e) => {
    e.waitUntil(
        Promise.all([
            self.clients.claim(), // Take control immediately
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

// 3. Fetch (Stale-While-Revalidate to KILL the loading bar, with Offline Fallback)
self.addEventListener('fetch', (e) => {
    // --- ADVANCED 405 FIX: Crash-Proof OS POST Request Interception ---
    if (e.request.method === 'POST' && e.request.url.includes('/share.html')) {
        e.respondWith((async () => {
            try {
                let formData;
                
                // Android throws URL-Encoded forms on text-only which crashes formData()
                try {
                    formData = await e.request.formData();
                } catch (formDataError) {
                    // Fallback to manual text parsing if it wasn't multipart
                    const rawText = await e.request.text();
                    const params = new URLSearchParams(rawText);
                    formData = {
                        getAll: (key) => [], // No files in URL Encoded fallback
                        get: (key) => params.get(key) || ''
                    };
                }

                // Safely grab the data
                const files = (formData.getAll && typeof formData.getAll === 'function') ? formData.getAll('shared_files') : [];
                const title = formData.get('title') || '';
                const text = formData.get('text') || '';
                const url = formData.get('url') || '';

                // ADVANCED FIX: Store in IndexedDB to survive Service Worker sleeping
                await new Promise((resolve) => {
                    try {
                        const request = indexedDB.open('GooracShareDB', 1);
                        request.onupgradeneeded = (evt) => {
                            evt.target.result.createObjectStore('shared_data');
                        };
                        request.onsuccess = (evt) => {
                            const db = evt.target.result;
                            const tx = db.transaction('shared_data', 'readwrite');
                            tx.objectStore('shared_data').put({ files, title, text, url }, 'latest_share');
                            tx.oncomplete = resolve;
                        };
                        request.onerror = resolve;
                    } catch(err) {
                        resolve();
                    }
                });

                // Send the files directly if the UI happens to be fully awake
                const client = await self.clients.get(e.clientId || await self.clients.matchAll().then(clients => clients[0]?.id));
                if (client) {
                    client.postMessage({ type: 'SHARED_DATA', files, title, text, url });
                }

                // Redirect the user to the actual page using GET (303)
                return Response.redirect('/share.html', 303);
                
            } catch (fatalError) {
                console.error("Fatal SW Catch:", fatalError);
                // IF EVERYTHING BURNS TO THE GROUND, FORCE A 303 REDIRECT ANYWAY TO PREVENT 405!
                return Response.redirect('/share.html', 303);
            }
        })());
        return; // Stop execution here so it doesn't hit the GET logic below
    }
    // ----------------------------------------------------------------

    // Only intercept standard GET requests
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((cachedResponse) => {
            
            // 1. Kick off a background network request to fetch the freshest data
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
