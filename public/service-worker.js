const CACHE_NAME = 'gemini-maze-race-cache-v8';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/privacy_policy.html',
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
    '/sounds/error.mp3',
    '/sounds/online-waiting.mp3',
    '/sounds/emoji-laugh.mp3',
    '/sounds/emoji-think.mp3',
    '/sounds/emoji-mind-blown.mp3',
    '/sounds/emoji-cool.mp3',
    '/sounds/emoji-wave.mp3',
    '/sounds/emoji-love.mp3',
    '/sounds/emoji-angry.mp3',
    '/sounds/emoji-waiting.mp3',
    '/home-page-background.png'
];

// Install event: cache the application shell and take control immediately
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching App Shell');
                // Use a separate addAll for critical path, and allow non-critical to fail gracefully
                const criticalAssets = ['/', '/index.html'];
                cache.addAll(criticalAssets);
                return cache.addAll(ASSETS_TO_CACHE).catch(error => {
                    console.warn('Service Worker: Caching non-critical assets failed, but proceeding.', error);
                });
            })
            .catch(error => {
                console.error('Failed to cache critical app shell:', error);
            })
    );
    self.skipWaiting();
});

// Activate event: clean up old caches and claim clients
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
            ).then(() => self.clients.claim());
        })
    );
});

// Fetch event: serve from cache, fallback to network, and cache new resources
self.addEventListener('fetch', event => {
    // We only want to handle GET requests
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
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
