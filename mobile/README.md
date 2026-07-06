# Ubumwe Beauty — React Native Mobile App 📱

> Beauty that unites us — Rwanda's cosmetics e-commerce app

A complete React Native (Expo) mobile app for Android & iOS, built to complement the Ubumwe Beauty web platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (or an emulator)
- The web backend running (see parent directory)

### Install & Run

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with Expo Go (Android) or camera (iOS).

### Environment Variables

Create a `.env` file:

```bash
EXPO_PUBLIC_API_URL=http://YOUR_BACKEND_URL:3000/api
```

For production, use your deployed backend URL.

## 📁 Project Structure

```
mobile/
├── App.tsx                      # Entry point (splash + navigation)
├── app.json                     # Expo config
├── package.json                 # Dependencies
├── babel.config.js              # Babel (NativeWind + Reanimated)
├── tailwind.config.js           # Tailwind theme (matches web)
├── tsconfig.json
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx    # Auth vs Main switch
│   │   ├── AuthNavigator.tsx    # Login → Register → OTP
│   │   ├── MainNavigator.tsx    # Bottom tabs (5 tabs)
│   │   └── OnboardingNavigator.tsx
│   ├── screens/                 # 14 screens
│   │   ├── SplashScreen.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── OtpScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ProductListScreen.tsx
│   │   ├── ProductDetailScreen.tsx
│   │   ├── CartScreen.tsx
│   │   ├── CheckoutScreen.tsx
│   │   ├── OrderTrackingScreen.tsx
│   │   ├── AccountScreen.tsx
│   │   ├── OrderHistoryScreen.tsx
│   │   ├── WishlistScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/
│   │   ├── api.ts               # HTTP client (auth + cache)
│   │   ├── storage.ts           # AsyncStorage + SecureStore
│   │   └── notifications.ts     # Expo push notifications
│   ├── store/
│   │   └── useStore.ts          # Zustand (auth + cart + wishlist)
│   ├── hooks/
│   │   ├── useBiometric.ts      # Fingerprint/Face ID
│   │   └── useOffline.ts        # Network status + cache
│   └── lib/
│       └── format.ts            # RWF formatting + constants
```

## 📱 Screens (14 total)

| # | Screen | Description |
|---|--------|-------------|
| 1 | Splash | Brand logo + loading |
| 2 | Onboarding | 3-slide intro (first launch) |
| 3 | Login | Phone + password + biometric |
| 4 | Register | Name + phone + password → OTP |
| 5 | OTP | 6-digit code with auto-advance |
| 6 | Home | Hero + categories + featured products |
| 7 | Product List | Grid with category filter |
| 8 | Product Detail | Image + info + add to cart + share |
| 9 | Cart | Items + qty + checkout |
| 10 | Checkout | Delivery + MTN MoMo payment |
| 11 | Order Tracking | Real-time timeline |
| 12 | Account | Profile + menu |
| 13 | Order History | Past orders list |
| 14 | Wishlist | Saved products |
| 15 | Notifications | In-app notifications |
| 16 | Settings | Language + notifications + biometric |

## ✨ Special Features

- **Push Notifications** — New orders, delivery updates via Expo Notifications
- **Biometric Login** — Fingerprint/Face ID via `expo-local-authentication`
- **Offline Browsing** — Cached products in AsyncStorage, NetInfo detection
- **WhatsApp Share** — Share products/orders via `Linking.openURL`
- **Deep Linking** — `ubumwe://` scheme for notification taps
- **Image Zoom** — `expo-image` with pinch-to-zoom
- **Camera** — `expo-camera` for review photos (ready to integrate)
- **NativeWind** — Tailwind CSS for React Native (matches web theme)

## 🎨 Brand Colors

```js
primary:      "#b76e79"  // Rose Gold
background:   "#fff8f3"  // Cream
foreground:   "#6d3a45"  // Deep Mauve
card:         "#ffffff"  // White
muted:        "#fce4ec"  // Blush Pink
border:       "#f3e0d8"  // Light Rose
```

## 🔧 Build for Production

### Android (APK/AAB)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build
eas build -p android --profile preview  # APK for testing
eas build -p android --profile production  # AAB for Play Store
```

### iOS

```bash
# Build
eas build -p ios --profile production

# Submit to App Store
eas submit -p ios
```

### Push Notifications Setup

1. **Android (FCM):**
   ```bash
   eas build:configure
   # Add google-services.json to android/app
   ```

2. **iOS (APNs):**
   ```bash
   # Upload APNs key to Expo
   eas credentials
   ```

3. **Register token:**
   The app automatically registers the push token on launch.
   Send it to your backend to associate with the user.

## 🔗 Deep Linking

Configure in `app.json`:
```json
{
  "scheme": "ubumwe"
}
```

Links:
- `ubumwe://product/{slug}` → Product Detail
- `ubumwe://order/{orderNumber}` → Order Tracking
- `ubumwe://cart` → Cart

## 📦 Dependencies

- **expo** 51 + React Native 0.74
- **React Navigation** 6 (native-stack + bottom-tabs)
- **NativeWind** 2 (Tailwind for RN)
- **Zustand** 4 (state management)
- **Expo modules**: secure-store, local-authentication, notifications, camera, image-picker, image, linking, haptics

## 🌐 Backend Integration

The app connects to the Ubumwe Beauty Next.js backend:
- API base: `EXPO_PUBLIC_API_URL`
- Auth: JWT tokens in SecureStore
- Offline: GET responses cached in AsyncStorage

All API endpoints are documented in the parent project's README.

---

Made with 🤍 in Kigali, Rwanda.
