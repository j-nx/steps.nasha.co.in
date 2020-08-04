var swKey = 'steps-VERSION_NUMBER';

self.addEventListener('install', function (e) {
    e.waitUntil(self.skipWaiting());
    e.waitUntil(
        caches.open(swKey).then(function (cache) {
            return cache.addAll([
                '/',
                '/index.html',
                '/demo.html',
                '/css/768.min.css',
                '/css/style.min.css',
                '/script.min.js',
                '/src/bowser.min.js',
                '/images/el2.png',
                '/images/gd72x72.png',
                '/images/steps-icon.png',
                '/images/steps.png',
                '/images/steps.svg',
                '/images/spin.svg',
                '/css/fonts/font-awesome/css/font-awesome.min.css',
                '/css/fonts/font-awesome/font/FontAwesome.otf?v=3.2.1',
                '/css/fonts/font-awesome/font/fontawesome-webfont.eot?v=3.2.1',
                '/css/fonts/font-awesome/font/fontawesome-webfont.svg?v=3.2.1',
                '/css/fonts/font-awesome/font/fontawesome-webfont.ttf?v=3.2.1',
                '/css/fonts/font-awesome/font/fontawesome-webfont.woff?v=3.2.1',
                '/css/fonts/fira-sans/css/fira-sans.css',
                '/css/fonts/fira-sans/font/fira-sans.eot',
                '/css/fonts/fira-sans/font/fira-sans.otf',
                '/css/fonts/fira-sans/font/fira-sans.svg',
                '/css/fonts/fira-sans/font/fira-sans.ttf',
                '/css/fonts/fira-sans/font/fira-sans.woff'
            ]);
        })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        })
    );
});

this.addEventListener('activate', function (event) {
    var cacheWhitelist = [swKey];
    event.waitUntil(
        caches.keys().then(function (keyList) {
            return Promise.all(
                keyList.map(function (key) {
                    if (cacheWhitelist.indexOf(key) === -1) {
                        console.log('Deleting Cache ' + key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    event.waitUntil(self.clients.claim());
});
