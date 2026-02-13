var swKey = 'steps-VERSION_NUMBER';

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(swKey).then(function (cache) {
            return cache.addAll([
                './',
                'index.html',
                'demo.html',
                'config.js',
                'css/768.min.css',
                'css/style.min.css',
                'script.min.js',
                'src/bowser.min.js',
                'images/el2.png',
                'images/gd72x72.png',
                'images/steps-icon.png',
                'images/steps.png',
                'images/steps.svg',
                'images/spin.svg',
                'css/fonts/font-awesome/css/font-awesome.min.css',
                'css/fonts/font-awesome/font/FontAwesome.otf?v=3.2.1',
                'css/fonts/font-awesome/font/fontawesome-webfont.eot?v=3.2.1',
                'css/fonts/font-awesome/font/fontawesome-webfont.svg?v=3.2.1',
                'css/fonts/font-awesome/font/fontawesome-webfont.ttf?v=3.2.1',
                'css/fonts/font-awesome/font/fontawesome-webfont.woff?v=3.2.1',
                'css/fonts/ibm-plex-sans/font/IBMPlexSans-Variable.woff2'
            ]);
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('fetch', function (event) {
    // Strip query string for cache matching (allows ?v=hash cache busting)
    var url = new URL(event.request.url);
    url.search = '';
    var cacheRequest = new Request(url.toString());

    event.respondWith(
        caches.match(cacheRequest).then(function (response) {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', function (event) {
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
        }).then(function () {
            return self.clients.claim();
        })
    );
});
