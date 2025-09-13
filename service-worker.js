const CACHE_NAME = 'gemini-maze-race-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    'privacy_policy.html',
    '/splash.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/sounds/ui-click.mp3',
    '/sounds/start-game.mp3',
    '/sounds/move-pawn.mp3',
    '/sounds/place-wall.mp3',
    '/sounds/win-game.mp3',
    '/sounds/lose-game.mp3',
    '/sounds/timer-tick.mp3',
    '/sounds/error.mp3'
];

// Install event: cache the application shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(error => {
                console.error('Failed to cache app shell:', error);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: serve from cache, fallback to network, and cache new resources
self.addEventListener('fetch', event => {
    // We only want to handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request)
                .then(response => {
                    // Return response from cache if found
                    if (response) {
                        return response;
                    }

                    // Otherwise, fetch from network
                    return fetch(event.request).then(networkResponse => {
                        // Cache the new response for future use
                        // We need to clone it because a response is a stream and can be consumed only once.
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(error => {
                   console.error('Service Worker fetch error:', error);
                   // Optionally, return a fallback offline page here.
                });
        })
    );
});