# Steps.nasha.co.in

**Setup**

Create a `config.js` in the client folder with your [Google Cloud Configuration](https://console.cloud.google.com/):
_(APIs & Services → Credentials in your selected project)_

```
const config = {
    CLIENT_ID:'YOUR_CLIENT_ID',
    API_KEY: 'YOUR_API_KEY'
};
```

**Run**

`npm start`

**Chrome**

Might need to run Chrome with these features for local dev:

`open -na Google\ Chrome --args --user-data-dir="/tmp/chrome_dev" --disable-web-security --disable-site-isolation-trials --ignore-certificate-errors --disable-gpu --allow-running-insecure-content --disable-blink-features=AutomationControlled --disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure,CrossOriginOpenerPolicy`

**Create Build**

- Create `config-prod.js`
- Run `npm run build` or `grunt`
- If running build locally will need to switch access key to dev (do not push that to prod)

**Run Test Spec**

`http://localhost:8000/tests/SpecRunner.html`

**Remote Debugging**

- Connect phone to USB
    - Enable Remote debugging on the phone
- If asked, connect to transfer files vs charge only
- You might need to enable the IP in Google Cloud e.g. `http://10.103.25.151.nip.io:8000`

To connect to localhost,

- Find out local IP (e.g. 172.18.128.1:8000)
- Connect to a DNS rebinding service like nip.io
    - `http://172.18.128.1.nip.io:8000/` (Note http)
- Allow access from this domain on firebase
- [Setup Chrome Debugging](https://developer.chrome.com/docs/devtools/remote-debugging/) on Desktop
    - `chrome://inspect/#devices`
