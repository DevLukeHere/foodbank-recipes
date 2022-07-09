const staticCacheName = 'site-static-v4';
const dynamicCacheName = 'site-dynamic-v5';
const assets = [
  "/",
  "/index.html",
  "/js/app.js",
  "/js/ui.js",
  "/js/materialize.min.js",
  "/css/styles.css",
  "/css/materialize.min.css",
  "/img/dish.png",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://fonts.gstatic.com/s/materialicons/v54/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2",
  "/pages/fallback.html",
];

// Cache size limit function
const limitCacheSize = (name, size) => {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if(keys.length > size) {
        cache.delete(keys[0]).then(limitCacheSize(name, size));
      }
    })
  })
};

// Install service worker
self.addEventListener('install', (e) => {
  console.log('service worker has been installed');
  // ensure that caches is successfully cached before installing service worker is completed
  e.waitUntil(
    caches.open(staticCacheName).then(cache => {
      console.log('caching shell assets');
      cache.addAll(assets);
    })
  )
});

// Activate event
self.addEventListener('activate', (e) => {
  console.log('service worker has been activated');
  // ensure that checking of version cache is completed before service worker activation is completed
  e.waitUntil(
    caches.keys().then(keys => {
      // console.log(keys);
      return Promise.all(keys
        .filter(key => key !== staticCacheName && key !== dynamicCacheName)
        .map(key => caches.delete(key))
      )
    })
  );
});

// Fetch events 
self.addEventListener('fetch', (e) => {
  // console.log('fetch event', e);
  if(e.request.url.indexOf('firestore.googleapis.com') === -1){
    // respond with cached items if available to render app
    e.respondWith(
      caches.match(e.request).then(cacheRes => {
        // return cached items if available else return initial fetch request from server
        return cacheRes || fetch(e.request).then(fetchRes => {
          return caches.open(dynamicCacheName).then(cache => {
            // adding new response to the dynamic cache for that page by storing a clone, where e.request.url is key and fetchRes.clone() is value
            cache.put(e.request.url, fetchRes.clone());
            // check size of cache after adding to the cache to limit size
            limitCacheSize(dynamicCacheName, 15)
            // returns original response to render page
            return fetchRes;
          })
        });
        // catch error if cached page is not found 
      }).catch(() => {
        // prevent other file formats to display same error fallback
        // search for .html in a string & returns an integer of the position of .html inside the string else return -1
        if(e.request.url.indexOf('.html') > -1) {
          return caches.match('/pages/fallback.html');
        }
      })
    );
  }
});