# React Native / Mobile Stack — Finding Patterns

Applies when `package.json` contains `react-native`, `expo`, or `@react-native-community`
dependencies. Covers both Expo-managed and bare React Native projects.

---

## CRED

**Patterns:**
- API keys or tokens hardcoded in JavaScript/TypeScript source (bundled into the app binary
  and extractable with standard tools)
- Credentials in `app.json`, `app.config.js`, or `eas.json` committed to the repo
- `AsyncStorage` used to store tokens, passwords, or sensitive session data
  (unencrypted on-device storage, accessible on rooted/jailbroken devices)
- Keys in `.env` files read via `react-native-dotenv` or `babel-plugin-dotenv` at build
  time (end up in the JS bundle)

**Bad:**
```typescript
const API_KEY = 'sk-abc123';  // extractable from app bundle
await AsyncStorage.setItem('authToken', token);  // unencrypted
```
**Good:**
```typescript
// API calls that need secrets should go through a backend proxy
const response = await fetch('https://your-api.com/endpoint');

// Sensitive tokens stored with encryption
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('authToken', token);
```

---

## AUTH

**Patterns:**
- Deep links handled without validating the source or intent parameters
  (can be triggered by a malicious app or webpage)
- Universal links / App Links not configured with a verified `apple-app-site-association`
  or `assetlinks.json` (allows link hijacking)
- WebView with `javaScriptEnabled={true}` and `onMessage` handler that evaluates
  message content without origin validation
- JWT decoded client-side and trusted for access decisions without server verification
- Biometric auth used as sole factor without server-side session validation

**Bad:**
```typescript
Linking.addEventListener('url', ({ url }) => {
  const { token } = parseUrl(url);
  loginWithToken(token);  // no validation of link origin
});
```
**Good:**
```typescript
Linking.addEventListener('url', ({ url }) => {
  if (!url.startsWith('myapp://verified-path/')) return;
  const { code } = parseUrl(url);
  exchangeCodeForSession(code);  // exchange on backend, not trust token directly
});
```

---

## INJECT

**Patterns:**
- WebView `injectedJavaScript` prop built with string concatenation including user data
- `eval()` or `new Function()` in business logic
- SQL injection via `expo-sqlite` or `react-native-sqlite-storage` with string concatenation
- `dangerouslySetInnerHTML` in React Native Web or hybrid components

**Bad:**
```typescript
<WebView
  injectedJavaScript={`window.userData = ${JSON.stringify(userInput)};`}
/>
```
**Good:**
```typescript
// Post message instead of injecting user data directly
webViewRef.current?.postMessage(JSON.stringify(userInput));
// Handle in onMessage with origin validation
```

---

## EXPOSE

**Patterns:**
- `console.log` statements left in production builds (visible in device logs, extractable
  from connected devices without root via `adb logcat`)
- Error boundaries that render exception messages or stack traces in the UI
- Network request logging middleware that logs full request/response bodies including auth headers
- Flipper or other debugging tools not disabled in production builds
- Crash reporters configured to upload full device state including environment variables

**Bad:**
```typescript
console.log('Auth token:', authToken);  // visible in adb logcat
```
**Good:**
```typescript
if (__DEV__) console.log('Auth token:', authToken.slice(0, 8) + '...');
```

---

## SUPPLY

**Patterns:**
- Native modules from unknown or low-reputation publishers (have device-level access)
- Expo plugins that run Node.js scripts during build with broad filesystem access
- `patch-package` patches that modify security-sensitive native code without review
- `eas.json` referencing build profiles that pull from unverified registries

**Check:**
```bash
npx expo-doctor           # checks for known issues
npm audit --audit-level=moderate
# Review any native module that requests permissions in AndroidManifest / Info.plist
```

---

## SCOPE

**Patterns:**
- `AndroidManifest.xml` requesting permissions not needed by declared features:
  `READ_CONTACTS`, `ACCESS_FINE_LOCATION`, `READ_CALL_LOG`, `CAMERA` without clear feature use
- `Info.plist` usage descriptions missing or generic ("This app uses your location")
- `expo-file-system` reading/writing outside the app's sandbox directory
- Background fetch or background sync accessing sensitive data without user awareness
- Third-party SDK initialized with permissions broader than the SDK requires

**Check:**
```bash
# Android — list requested permissions
grep -r 'uses-permission' android/app/src/main/AndroidManifest.xml

# iOS — list usage description keys
grep -E 'UsageDescription' ios/*/Info.plist
```

---

## CI

Same patterns as the universal CI category. Additionally watch for:
- EAS build secrets referenced in `eas.json` or `app.config.js` in a way that bakes them
  into the bundle rather than keeping them server-side
- Signing keys or certificates stored in the repo rather than in EAS secrets or CI secrets
- Build scripts that print environment variables (signing passwords, store credentials)
