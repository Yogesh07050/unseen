# Android app (native shell)

The PWA ships as a real Android app through **Capacitor 6** — `app/android/`
is a standard Gradle/Kotlin project. Every screen, engine and animation is the
web code, unchanged; the shell adds what only the platform can do:

- Native haptics on each Scripture strike, the native share sheet (Allies,
  Reel), hardware **Back** (un-hides the privacy screen / goes back / steps out
  from Home — never kills a battle), splash + status bar that follow the theme,
  and online/offline from the OS.
- `allowBackup="false"` — the encrypted log is never cloud-backed-up.

The hooks live in `app/src/native/index.ts` (all no-ops on the web) and the
shell configuration in `app/capacitor.config.ts`. Paths below are relative to
the repository root.

Requirements: **JDK 17** (Capacitor 6 / AGP 8.2.1) and Android SDK platform 34.

## Build and install (Linux / macOS)

```bash
cd app
# 1. Web bundle pointed at your backend. The WebView serves the UI from its own
#    origin, so the API host must be explicit (your LAN IP for a device demo):
VITE_API_BASE=http://192.168.0.123:8000 npm run build:native   # vite build + cap sync
# 2. Launcher icon + splash (generated from public/icons; re-run if they change)
npm run android:assets
# 3. Debug APK
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ANDROID_HOME=~/Android/Sdk
npm run android:apk        # → android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

For an emulator, build with `VITE_API_BASE=http://10.0.2.2:8000` (the host as
seen from the Android emulator).

## Setting up on Windows (from nothing to the phone)

1. **Install the tools** (all free): Git for Windows; Node.js 20 LTS; Python
   3.12 (tick *Add python.exe to PATH*); JDK 17 (Adoptium Temurin, tick *Set
   JAVA_HOME*); Android Studio, then in its SDK Manager add *Android 14 (API
   34)*, *Build-Tools 34* and *Platform-Tools*; PostgreSQL 16 (or Docker
   Desktop and the `docker run … postgres:16` line in `database/README.md`).
2. **Environment variables** (Settings → System → About → Advanced → Environment
   Variables): `ANDROID_HOME = %LOCALAPPDATA%\Android\Sdk`, `JAVA_HOME` to the
   JDK 17 folder, and add `%ANDROID_HOME%\platform-tools` to `Path` so `adb`
   works in any terminal. Open a new PowerShell afterwards.
3. **Get the code and configure it**
   ```powershell
   git clone <this repository> ; cd gloo-hackathon-UNSEEN
   copy .env.example .env          # then edit .env: DATABASE_URL, YVP_APP_KEY, GLOO_*, OPENAI_API_KEY, SEED_USER_PASSWORD
   ```
4. **Server, database, seed**
   ```powershell
   cd server ; py -3.12 -m venv .venv ; .venv\Scripts\Activate.ps1 ; pip install -r requirements.txt ; cd ..
   python database\migrate.py
   python database\seeds\seed.py
   python database\seeds\seed_user.py --username yogesh --name Yogesh
   cd server ; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000     # leave this running
   ```
   Allow the port through the firewall once (admin PowerShell):
   `netsh advfirewall firewall add rule name="UNSEEN API" dir=in action=allow protocol=TCP localport=8000`
5. **Web app** (second terminal): `cd app ; npm install ; npm run dev -- --port 5174`,
   then open http://localhost:5174 and sign in.
6. **Find this PC's Wi-Fi address**: `ipconfig` → *IPv4 Address* of the Wi-Fi
   adapter (e.g. 192.168.0.123). The phone must be on the same Wi-Fi.
7. **Build the Android app against that address** (PowerShell):
   ```powershell
   cd app
   $env:VITE_API_BASE = "http://192.168.0.123:8000" ; npm run build:native
   cd android ; .\gradlew.bat assembleDebug ; cd ..        # or: npx cap open android → Build → Build APK(s)
   ```
8. **Connect the phone and install** — follow *Connecting a phone over Wi-Fi*
   below (`adb pair`, `adb connect`, `adb devices`), then
   ```powershell
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   adb shell am start -n com.unseen.app/.MainActivity
   ```
   On Windows `adb` is the SDK one from step 2, so no full path is needed.

## Connecting a phone over Wi-Fi (wireless debugging)

No cable needed. On the phone: **Settings → Developer options → Wireless
debugging** (turn it on; the phone and this machine must be on the same Wi-Fi).
Use the SDK's own adb by full path — a distribution-packaged `/usr/bin/adb` can
be older and unable to discover the phone.

```bash
ADB=~/Android/Sdk/platform-tools/adb
# 1. Pair once. On the phone tap "Pair device with pairing code" and read the
#    IP:PORT and the 6-digit code shown there (the pairing port is NOT the
#    connect port):
$ADB pair 192.168.0.162:37123        # then type the 6-digit code
# 2. Connect. The connect IP:PORT is on the main Wireless debugging screen
#    (the port changes every time wireless debugging is switched on):
$ADB connect 192.168.0.162:41567
# 3. Check it is attached (a wireless device shows as adb-<serial>._adb-tls-connect):
$ADB devices -l
```

After the first pairing, adb usually re-finds the phone by itself (mDNS) the
next time Wireless debugging is on. If `adb devices` stays empty: make sure the
SDK adb owns the server (`cat ~/.android/adb.5037` should print its path), then

```bash
$ADB kill-server && $ADB start-server && $ADB mdns services   # discovery; then `connect` again if needed
```

Keep the phone unlocked with the Wireless debugging screen open while you
install. Then build, install and launch:

```bash
cd app
IP=$(ip route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')   # this machine's LAN IP
VITE_API_BASE=http://$IP:8000 npm run build:native
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ANDROID_HOME=~/Android/Sdk
npm run android:apk
$ADB install -r android/app/build/outputs/apk/debug/app-debug.apk   # -r keeps the app's data
$ADB shell am start -n com.unseen.app/.MainActivity
$ADB exec-out screencap -p > phone.png                               # a screenshot, to check
$ADB logcat -s chromium Capacitor                                     # WebView console, if something is off
```

The API must be reachable from the phone: start it with `--host 0.0.0.0`
(`cd server && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`)
and keep port 8000 open on this machine's firewall. The app then shows the
sign-in page; after signing in it pulls the account's history from the server.

## Production notes

The server must allow the app's origin — `CORS_ORIGINS` already includes
`https://localhost` (the Capacitor WebView origin). For a LAN demo the shell is
configured for plain HTTP (`server.cleartext`, `android.allowMixedContent` in
`capacitor.config.ts`, and `usesCleartextTraffic` in the manifest): **remove all
three for a production build whose API is served over HTTPS.**

Troubleshooting: if you move the repo, recreate the server venv
(`python3 -m venv --clear .venv && pip install -r requirements.txt`) — venv
entry scripts hard-code their original path (or run `python -m uvicorn …`).
