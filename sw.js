const CACHE_NAME = 'goorac-quantum-v13'; // Bumped to v13 to trigger immediate update
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
    '/userProfile.html',
    '/vision.html',
    '/visionLobby.html',
    '/notification-worker.js',
    'https://cdn-icons-png.flaticon.com/128/3067/3067451.png',
    'https://cdn-icons-png.flaticon.com/512/3067/3067451.png'
];

// 1. Install (Cache Files)
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(c => {
        // Use cache.addAll if you want strict "all or nothing" caching
        // Your current method is fine if you want to be lenient
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
                        // Delete any cache that doesn't match the current CACHE_NAME
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
    // Only intercept standard GET requests
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            
            // 1. Kick off a background network request to fetch the freshest data
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    // Update the cache silently in the background so the next launch is up-to-date
                    // We clone() the response because it can only be consumed once
                    if (networkResponse.ok) {
                        cache.put(e.request, networkResponse.clone());
                    }
                });
                return networkResponse;
            }).catch(() => {
                // Network failed (user is offline). 
                // If they are trying to navigate to a new page, fallback to home.html
                if (e.request.mode === 'navigate') {
                    return caches.match('/home.html');
                }
            });

            // 2. THE MAGIC TRICK: Return the cached response INSTANTLY if we have it.
            // If we don't have it in the cache yet, wait for the network fetch.
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
