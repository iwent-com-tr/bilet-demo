// public/sw.js
self.addEventListener('install', (event) => {
    console.log('[SW] Installed');
  });
  
  self.addEventListener('activate', (event) => {
    console.log('[SW] Activated');
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
  });