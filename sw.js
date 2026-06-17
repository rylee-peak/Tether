// Change this version number to force an update for all users!
const CACHE_NAME = 'tether-app-cache-v9'; 

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event - Pre-cache the main files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event - Clean up old caches when the new version takes over
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network first for HTML, Cache first for CDNs/Images
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Skip caching Firebase API calls
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebasestorage.googleapis.com') ||
      event.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Listen for the "Force Update" command from the frontend
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});