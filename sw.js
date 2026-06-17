// ==========================================================
// 1. IMPORT ONESIGNAL (Must be at the very top!)
// ==========================================================
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");


// ==========================================================
// 2. OFFLINE CACHE CONFIGURATION
// ==========================================================
// CHANGE THIS VERSION NUMBER whenever you update your app's HTML/JS!
const CACHE_NAME = 'tether-app-cache-v10'; 

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.json'
];

// Install Event - Pre-cache the main files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event - Clean up old caches when version changes
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete any cache that belongs to Tether but doesn't match the current version
          if (cacheName.startsWith('tether-app-cache-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Dynamic caching with offline fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Do NOT cache Firebase or OneSignal backend API calls!
  const skipUrls = [
    'firestore.googleapis.com', 
    'firebasestorage.googleapis.com', 
    'identitytoolkit.googleapis.com', 
    'onesignal.com'
  ];
  
  if (skipUrls.some(url => event.request.url.includes(url))) {
    return;
  }

  // Network-first strategy: Try to grab from the web, fallback to offline cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone and dynamically cache the new successful response
        if (response && response.status === 200 && response.type === 'basic') {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return response;
      })
      .catch(() => {
        // If the network fails (user is offline), serve from the cache
        return caches.match(event.request);
      })
  );
});