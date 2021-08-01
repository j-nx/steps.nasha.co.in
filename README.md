# Steps.nasha.co.in

**Setup**

Create a config.js in the root folder:

```
const config = {
    CLIENT_ID:'YOUR_CLIENT_ID',
    API_KEY: 'YOUR_API_KEY'
};
```

**Run**

`python -m http.server`

**Create Build**

-   Create config-prod.js
-   Run `grunt`

**Deploy Build**

-   [Instructions on Trello](https://trello.com/c/0Kgcc1Bl/463-deployment)

**Remote Debugging**

-   Connect phone to USB
    -   Enable Remote debugging on the phone

To connect to localhost,

-   Find out local IP (e.g. 172.18.128.1:8000)
-   Connect to a DNS rebinding service like nip.io
    -   `http://172.18.128.1.nip.io:8000/` (Note http)
-   Allow access from this domain on firebase
-   [Setup Chrome Debugging](https://developer.chrome.com/docs/devtools/remote-debugging/) on Desktop
    -   `chrome://inspect/#devices`
