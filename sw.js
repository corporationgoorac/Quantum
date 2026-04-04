const CACHE_NAME = 'goorac-quantum-v54'; // Bumped to trigger immediate update
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

// 3. Fetch (Stale-While-Revalidate to KILL the loading bar, with Offline Fallback & Share Interception)
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // --- NEW: Intercept POST requests heading to /api/share for the Web Share Target ---
    if (e.request.method === 'POST' && url.pathname.endsWith('/api/share')) {
        e.respondWith((async () => {
            try {
                // 1. Extract the media files from the phone's share intent
                const formData = await e.request.formData();

                // 2. Send to Hugging Face. 
                // CRITICAL: We use redirect: 'manual' so the browser doesn't swallow your server's redirect!
                const backendResponse = await fetch('https://corporationgoorac-quantumbackend.hf.space/share/receiver', {
                    method: 'POST',
                    body: formData,
                    redirect: 'manual' 
                });

                // 3. Grab the EXACT redirect URL your backend generated (e.g., /share.html?tempId=...)
                const redirectUrl = backendResponse.headers.get('Location');

                if (redirectUrl) {
                    // 4. Send the user straight to that URL so your frontend can pull the file from RAM
                    return Response.redirect(redirectUrl, 303);
                } else {
                    // Fallback if the backend fails to send a Location header
                    return Response.redirect('/share.html?error=no_location', 303);
                }

            } catch (error) {
                console.error('Quantum Share Error:', error);
                return Response.redirect('/share.html?error=upload_failed', 303);
            }
        })());
        return; // Stop further execution for this specific request
    }
    // -----------------------------------------------------------------------------------

    // Only intercept standard GET requests
    if (e.request.method !== 'GET') return;

    e.respondWith(
        // ADDED { ignoreSearch: true } HERE to ignore query parameters that break caching
        caches.match(e.request, { ignoreSearch: true }).then((cachedResponse) => {
            
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
