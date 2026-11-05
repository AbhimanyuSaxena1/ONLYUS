# ONLYUS ❤️
### Private Video Calling, Audio Calling & Chat Application

**OnlyUs** is a production-ready, mobile-first private communication platform built exclusively for two authorized people. Engineered as an intimate, secure alternative to WhatsApp and FaceTime, it features peer-to-peer WebRTC video and audio calling, instant messaging with image sharing, real-time presence indicators, background Web Push notifications, and progressive web app (PWA) installation.

---

## 1. Strict Monochrome Design System
The entire application adheres strictly to a clean, black-and-white minimalist aesthetic:
- **Main background:** `#080808`
- **Secondary background:** `#111111`
- **Card background:** `#181818`
- **Elevated background:** `#202020`
- **Primary text:** `#FFFFFF`
- **Secondary text:** `#A1A1AA`
- **Muted text:** `#71717A`
- **Borders:** `#292929`
- **Action buttons:** White background with solid black text
- **Strictly Prohibited:** Zero purple, violet, indigo, lavender, or purple gradients.
- **Icons:** Exclusively **Heroicons** (`@heroicons/react`). No Lucide React.

---

## 2. Technology Stack

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** (Custom monochrome palette & mobile safe-area insets)
- **React Router 6**
- **Zustand** (Auth, Call, Chat, Presence store management)
- **Axios** (With automatic JWT refresh interceptor)
- **Socket.IO Client** (Presence, WebRTC signaling & real-time chat)
- **Native WebRTC APIs** (`RTCPeerConnection`, `getUserMedia`, `replaceTrack`, ICE candidates)
- **vite-plugin-pwa** (Service Worker, Web App Manifest, Standalone display)
- **Web Audio API** (Zero-asset audio synthesizer for incoming ringtone, ringback, and message chimes)

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- **Socket.IO** (Authenticated WebSocket rooms and WebRTC signaling)
- **MongoDB Atlas** / **Mongoose** (With automatic in-memory fallback for instant dev testing)
- **JWT** (Short-lived access tokens + HTTP-only rotating refresh tokens)
- **bcryptjs** (Password hashing with salt rounds)
- **Zod** (Request validation schemas)
- **Web Push API** + **VAPID** (`web-push` library for background push notifications)
- **Multer** (Secure image uploads with MIME-type and size validation)
- **Helmet**, **CORS**, and **Express Rate Limit**

---

## 3. Features & Architecture

### A. Private Authentication System
- Strictly **two** accounts allowed.
- Public registration locks automatically once two accounts are registered.
- Any subsequent attempt receives a `403 Forbidden` response.
- Password hashing with bcrypt, persistent sessions, and secure token rotation.

### B. Real-Time WebRTC Calling
- **Video Calling:** Full-screen remote video with a floating, draggable picture-in-picture (PIP) preview of the local camera.
- **Audio Calling:** Dedicated audio-only call mode with audio ripple animation and avatar display (does not request camera access).
- **WebRTC Signaling via Socket.IO:** Relays SDP offers, answers, and ICE candidate exchanges.
- **True Track Control:**
  - Microphones are muted by setting `audioTrack.enabled = false` and synchronizing remote mute state.
  - Cameras are toggled by disabling the video track and synchronizing camera-off placeholders.
  - Front and rear mobile cameras switch smoothly using `replaceTrack()` without reconnecting the call.
- **Auto Reconnection:** Handles network drops with ICE restart.

### C. Real-Time Chat
- Real-time messaging powered by Socket.IO with MongoDB persistence.
- Single tick (sent), double tick (delivered), and solid checkmark (read) receipts.
- Live typing indicators ("typing...").
- Photo sharing with upload progress and full-size image viewer.
- Reply-to messages and message deletion.

### D. Web Push & Background Notifications
- Web Push API with VAPID keys.
- Custom service worker (`client/public/sw.js`) intercepts push events and displays native notification banners with custom ringtone vibrations and `Accept` / `Decline` action buttons.
- Tapping a notification opens the app and directly joins the active call invitation.

---

## 4. Project Structure

```
onlyus/
├── client/                     # Frontend Vite + React + TypeScript + PWA
│   ├── public/
│   │   ├── icons/              # PWA and app icons
│   │   └── sw.js               # Service Worker for push & notifications
│   ├── src/
│   │   ├── components/         # Avatar, Button, Input, Header, BottomNav
│   │   ├── features/
│   │   │   ├── auth/           # Login & Registration views
│   │   │   ├── calling/        # VideoCallScreen, AudioCallScreen, CallModal
│   │   │   ├── chat/           # ChatWindow, Message bubbles, File upload
│   │   │   └── presence/       # Partner presence indicators
│   │   ├── hooks/              # useSocket, useMediaDevices, useCall, useAuth
│   │   ├── layouts/            # AppLayout with global call modals
│   │   ├── pages/              # HomePage, ChatPage, CallsHistoryPage, SettingsPage, AuthPage
│   │   ├── routes/             # AppRoutes with auth guards & URL params
│   │   ├── services/           # api, socket, webrtc, push, soundEffects
│   │   ├── store/              # authStore, callStore, chatStore
│   │   └── types/              # TypeScript interfaces
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── server/                     # Backend Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/             # env, db, vapid, turn
│   │   ├── controllers/        # auth, message, call, push
│   │   ├── middleware/         # auth, upload, rateLimiter
│   │   ├── models/             # User, Message, Call, Device, CallInvitation
│   │   ├── routes/             # authRoutes, messageRoutes, callRoutes, pushRoutes
│   │   ├── services/           # pushService, turnService
│   │   ├── sockets/            # socketServer (Presence, Calling, Signaling, Chat)
│   │   ├── types/              # Socket & API data types
│   │   ├── utils/              # logger, token
│   │   └── server.ts           # Express entry point
│   ├── uploads/                # Local storage for shared chat photos
│   ├── generate-vapid.js       # VAPID key generator utility
│   ├── tsconfig.json
│   └── package.json
├── package.json                # Root workspace orchestration
└── README.md
```

---

## 5. Local Setup & Quickstart

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 9+

### 1. Clone & Install
```bash
cd onlyus
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment Variables
Copy `.env.example` in both folders:

**`server/.env`:**
```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/onlyus
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_characters
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_characters

# Web Push VAPID keys (automatically generated in dev if blank)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:support@onlyus.app

# Optional TURN server (Google STUN is enabled by default)
TURN_SERVER_URL=
TURN_USERNAME=
TURN_CREDENTIAL=
```

**`client/.env`:**
```env
VITE_API_URL=
```
*(Leave `VITE_API_URL` blank in development to use Vite's proxy automatically).*

### 3. Generate VAPID Keys (Optional)
To generate permanent VAPID keys for Web Push:
```bash
node server/generate-vapid.js
```
Paste the output keys into `server/.env`.

### 4. Start Development Servers
In two terminal tabs:

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

The frontend will be available at `http://localhost:5173` (or accessible on your local Wi-Fi IP e.g. `http://192.168.x.x:5173`).

---

## 6. WebRTC STUN & TURN Setup

While Google's free STUN servers (`stun:stun.l.google.com:19302`) allow peer-to-peer connections across most home networks, symmetric NATs (common on cellular 4G/5G mobile networks) require a **TURN relay server**.

### Free & Low-Cost TURN Options:
1. **Metered.ca** (Free 50GB/month):
   - Sign up at [metered.ca](https://www.metered.ca/tools/openrelay/).
   - Copy your TURN credentials into `server/.env`:
     ```env
     TURN_SERVER_URL=turn:openrelay.metered.ca:80
     TURN_USERNAME=openrelayproject
     TURN_CREDENTIAL=openrelayproject
     ```
2. **Self-Hosted Coturn:**
   - Install Coturn on an Ubuntu VPS: `sudo apt install coturn`.
   - Configure `/etc/turnserver.conf` with a listening port and realm.

---

## 7. Production Deployment

### Option A: Unified Full-Stack Deployment on Render
The server is pre-configured to automatically serve the production Vite frontend build if `client/dist` exists.

1. Build the frontend:
   ```bash
   cd client && npm run build
   ```
2. Build the server:
   ```bash
   cd ../server && npm run build
   ```
3. Deploy to **Render** as a Web Service:
   - **Build Command:** `npm --prefix client install && npm --prefix client run build && npm --prefix server install && npm --prefix server run build`
   - **Start Command:** `npm --prefix server run start`
   - **Environment Variables:** Set `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.

### Option B: Split Deployment (Vercel + Render)
- **Frontend on Vercel:** Point repository root to `client/`, set build command to `npm run build` and output directory to `dist/`. Set environment variable `VITE_API_URL=https://your-render-backend.onrender.com/api`.
- **Backend on Render:** Set root to `server/`, build command `npm install && npm run build`, start command `npm run start`. Set `CLIENT_URL=https://your-app.vercel.app`.

---

## 8. Physical Device Testing Checklist

Follow this checklist to verify functionality across two devices:

| # | Feature | Verification Step |
|---|---|---|
| 1 | Account Registration | Device A registers as User 1; Device B registers as User 2. |
| 2 | Gatekeeping | Device C attempts to register -> Expect `403 Forbidden` (closed registration). |
| 3 | Presence | Open Device A -> Device B updates to "Online" (green dot) in real time. |
| 4 | Real-time Chat | Send text and photo from Device A -> Device B receives instantly with chime. |
| 5 | Read Receipts | Open chat on Device B -> Device A indicators turn to double checkmarks. |
| 6 | Outgoing Call | Device A initiates Video Call -> Outgoing ringback tone plays. |
| 7 | Incoming Dialog | Device B rings with harmonic incoming ringtone and caller modal. |
| 8 | WebRTC Video | Accept call -> Remote video displays full-screen, local video appears in PIP. |
| 9 | Microphone Mute | Device A clicks Mute -> Audio track disabled; Device B shows "Partner is muted". |
| 10 | Camera Controls | Device A disables camera -> Shows camera-off placeholder; switches back/front camera smoothly. |
| 11 | Audio Call | Initiate Audio Call -> Validates no camera prompt requested; audio waveform animates. |
| 12 | Call Termination | Click Hangup -> Call ends cleanly, duration logged to Call History. |
| 13 | Background Push | Minimize Device B browser -> Device A calls -> Native Push notification received. |
| 14 | PWA Installation | Add to Home Screen on iOS / Android -> Opens standalone with zero browser chrome. |
