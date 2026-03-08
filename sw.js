const CACHE_NAME = 'goorac-quantum-v12'; 
const ASSETS = [
    '/',
    '/home.html',
    '/chat.html',
    '/config.js',
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

// 3. Fetch (Offline Support)
self.addEventListener('fetch', (e) => {
    if (e.request.mode === 'navigate') {
        e.respondWith(fetch(e.request).catch(() => caches.match('/home.html')));
    } else {
        // Cache First Strategy
        e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
    }
});

// 4. Notification Click
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = e.notification.data?.url || '/home.html';
    e.waitUntil(clients.openWindow(url));
});

// 5. Update Listener (Added to connect to your UI Update Button)
self.addEventListener('message', (event) => {
    if (event.data && (event.data === 'SKIP_WAITING' || event.data.action === 'skipWaiting')) {
        self.skipWaiting();
    }
});
