# MediScribe AI - Frontend# Qwik + Vite



React + TypeScript frontend with real-time audio capture and AI-powered clinical assistance.## Qwik in CSR mode



## 🚀 Quick StartThis starter is using a pure CSR (Client-Side Rendering) mode. This means, that the application is fully bootstrapped in the browser. Most of Qwik innovations however take advantage of SSR (Server-Side Rendering) mode.



```powershell```ts

# Install dependenciesexport default defineConfig({

npm install  plugins: [

    qwikVite({

# Copy environment file      csr: true,

copy .env.example .env    }),

  ],

# Start development server})

npm run dev```

```

Use `npm create qwik@latest` to create a full production ready Qwik application, using SSR and [QwikCity](https://qwik.dev/docs/qwikcity/), our server-side metaframwork.

Open `http://localhost:5173`

## Usage

## 📦 Features

```bash

✅ Real-time audio capture (microphone + system audio)  $ npm install # or pnpm install or yarn install

✅ Live speech-to-text transcription  ```

✅ AI-generated diagnostic questions  

✅ Clinical context extraction  Learn more on the [Qwik Website](https://qwik.dev) and join our community on our [Discord](https://qwik.dev/chat)

✅ Conversation summaries  

✅ Minimalist medical-themed UI  ## Available Scripts



## 🎯 UsageIn the project directory, you can run:



1. **Start Session**: Click "Start Session" on landing page### `npm run dev`

2. **Grant Permissions**: Allow microphone and screen sharing

3. **Start Recording**: Begin capturing conversationRuns the app in the development mode.<br>

4. **Get Questions**: Click refresh to generate diagnostic questionsOpen [http://localhost:5173](http://localhost:5173) to view it in the browser.

5. **View Context**: Click refresh to extract clinical information

6. **Generate Summary**: Get conversation overview anytime### `npm run build`



## 🔧 ConfigurationBuilds the app for production to the `dist` folder.<br>


Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

## 📁 Structure

```
src/
├── components/     # UI components
├── hooks/          # Custom React hooks
├── pages/          # Page components
├── services/       # API & WebSocket
├── store/          # State management
└── types/          # TypeScript types
```

## 🛠️ Tech Stack

- React 18 + TypeScript
- Tailwind CSS
- Zustand (state)
- React Router
- Web Audio API
- WebSocket

## 🐛 Troubleshooting

**Audio not working?**
- Check browser permissions
- Use Chrome/Edge for best support
- Ensure backend is running

**No transcript?**
- Verify WebSocket connection
- Check backend logs
- Speak clearly into microphone

**Questions not generating?**
- Wait for some conversation first
- Click the refresh button
- Check backend API keys

## 📝 Build

```powershell
npm run build  # Build for production
npm run preview  # Preview production build
```

---

**Note**: Backend must be running on `localhost:8000`
