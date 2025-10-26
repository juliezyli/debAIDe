# 🎤 debAIDe

**AI-powered debate practice platform with real-time feedback and 1v1 battle mode**

debAIDe helps you master the art of debate through AI-powered coaching, instant feedback, and competitive battles with other debaters. Practice solo or challenge opponents in real-time debates.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-blue.svg)](https://expo.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)

## ✨ Features

### 🎯 Practice Mode
- **AI-Powered Topics** - Choose from curated topics or get daily AI-generated suggestions
- **Voice Recording** - Record your opening, rebuttal, and closing statements
- **Auto-Transcription** - Automatic speech-to-text conversion
- **Instant AI Feedback** - Get detailed scores on structure, logic, delivery, and time management
- **Personalized Coaching** - Receive strengths, improvement areas, and targeted practice drills
- **Key Moments** - AI identifies and highlights your best arguments with timestamps

### ⚔️ Battle Mode
- **1v1 Debates** - Challenge other users in real-time debates
- **Matchmaking** - Find opponents or join existing battle rooms
- **Turn-Based System** - Take turns presenting arguments in structured debate rounds
- **AI Judging** - Automated scoring and winner determination
- **Leaderboards** - Track your win rate, streaks, and climb the rankings
- **Battle History** - Review past debates and learn from your performances

### 🎨 User Experience
- **Dark/Light Mode** - Beautiful theme switching throughout the app
- **Cross-Platform** - iOS, Android, and Web support via Expo
- **Real-Time Updates** - Live battle status and instant feedback
- **User Stats** - Comprehensive statistics tracking your progress

## 🚀 Tech Stack

**Frontend**
- React Native (Expo) - Cross-platform mobile framework
- TypeScript - Type-safe development
- React Query - Server state management
- Zustand - Global state management
- Expo AV - Audio recording and playback

**Backend**
- FastAPI - High-performance Python API framework
- PostgreSQL - Relational database
- SQLAlchemy - Async ORM
- Google Gemini AI - Scoring, feedback, and judging
- Whisper - Speech-to-text transcription
- Uvicorn - ASGI server

## � Screenshots

*Practice Mode - Topic Selection*  
Choose from diverse debate topics or try the AI-generated topic of the day.

*Battle Mode - Live Debate*  
Compete against real opponents in structured, turn-based debates.

*Results - AI Feedback*  
Get detailed scoring and personalized improvement suggestions.

##  Project Structure

```
debaide/
├── backend/
│   ├── main.py                  # FastAPI application
│   ├── models.py                # Database models (Users, Topics, Sessions, Battles)
│   ├── database.py              # PostgreSQL configuration
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── services/
│   │   ├── gemini_service.py    # AI scoring, feedback & judging
│   │   ├── storage_service.py   # Audio file management
│   │   ├── stt_service.py       # Speech-to-text transcription
│   │   └── auth_service.py      # JWT authentication
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── _layout.tsx          # Root navigation
    │   ├── index.tsx            # Auth redirect
    │   ├── home.tsx             # Main dashboard
    │   ├── topics.tsx           # Topic selection
    │   ├── session.tsx          # Practice recording
    │   ├── results.tsx          # Practice feedback
    │   ├── auth/                # Login & registration
    │   └── battle/              # Battle mode screens
    │       ├── lobby.tsx        # Matchmaking
    │       ├── room.tsx         # Live battle
    │       └── results.tsx      # Battle outcome
    ├── components/
    │   ├── NavBar.tsx           # Navigation component
    │   └── ThemeToggle.tsx      # Dark mode toggle
    ├── lib/
    │   ├── api.ts               # API client
    │   ├── theme.tsx            # Theme configuration
    │   ├── authStore.ts         # Auth state
    │   └── store.ts             # Global state
    ├── package.json
    └── .env.example
```

## 🛠️ Setup Instructions

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL 14+** (or use Neon DB, Supabase)
- **Gemini API Key** (get from [Google AI Studio](https://makersuite.google.com/))

### Quick Start (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/juliezyli/debaide.git
   cd debaide
   ```

2. **Set up backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your DATABASE_URL and GEMINI_API_KEY
   python main.py
   ```
   Backend runs at `http://localhost:8000` • API docs at `/docs`

3. **Set up frontend (in a new terminal):**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env if backend is not on localhost:8000
   npx expo start
   ```
   Then scan the QR code with Expo Go app or press `w` for web

### Detailed Setup

<details>
<summary><b>Backend Configuration</b></summary>

1. **Install Python 3.11+** and PostgreSQL 14+

2. **Set up database:**
   - **Option A:** Local PostgreSQL
     ```bash
     psql postgres
     CREATE DATABASE debaide;
     ```
   - **Option B:** [Neon DB](https://neon.tech) (recommended - free serverless)
   - **Option C:** [Supabase](https://supabase.com)

3. **Get Gemini API Key:**
   - Visit [Google AI Studio](https://makersuite.google.com/)
   - Sign in and create a new API key (free tier available)

4. **Configure .env:**
   ```env
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/debaide
   GEMINI_API_KEY=your_gemini_api_key_here
   SECRET_KEY=your_secret_key_for_jwt
   API_BASE_URL=http://localhost:8000
   ```

5. **Run the server:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

</details>

<details>
<summary><b>Frontend Configuration</b></summary>

1. **Install Node.js 18+**

2. **Configure .env:**
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Run on different platforms:**
   ```bash
   npx expo start
   ```
   - **iOS:** Press `i` (requires Xcode on macOS)
   - **Android:** Press `a` (requires Android Studio)
   - **Web:** Press `w`
   - **Mobile device:** Scan QR with Expo Go app

</details>

## 🛠️ Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (or use Neon DB, Supabase)
- Gemini API Key ([Get it here](https://makersuite.google.com/))
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env if your backend is not on localhost:8000
   ```

4. **Start Expo:**
   ```bash
   npm start
   ```

5. **Run on device:**
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web

## 🎮 How to Use

### Practice Mode
1. **Sign up / Log in** to your account
2. **Choose a topic** from the list or try the daily AI-generated topic
3. **Get your stance** - System assigns you PRO or CON position
4. **Record your debate** in three segments:
   - Opening Statement (introduce your position)
   - Rebuttal (counter opposing arguments)
   - Closing Argument (summarize and conclude)
5. **Review AI feedback** - Get scores, strengths, improvements, and practice drills

### Battle Mode
1. **Enter the lobby** and see available battles
2. **Create a room** or join an existing one
3. **Wait for opponent** to join
4. **Take turns debating:**
   - Each player records their segments
   - AI transcribes in real-time
   - Follow turn-based structure
5. **Get AI judgment** - Winner determined by overall performance
6. **Check leaderboard** to see your ranking

## 📊 API Documentation

### Authentication
- `POST /register` - Create new account
- `POST /login` - Get access token
- `GET /users/me` - Get current user info

### Practice Mode
- `GET /topics` - List all topics
- `GET /topics/daily` - Get/generate daily topic
- `POST /session/start` - Start practice session
- `POST /segment/upload` - Upload audio segment
- `POST /segment/text` - Submit text segment
- `POST /session/score` - Score completed session
- `GET /session/{id}/history` - Get session details

### Battle Mode
- `GET /battle/available` - List open battles
- `POST /battle/create` - Create new battle room
- `POST /battle/{id}/join` - Join a battle
- `GET /battle/{id}` - Get battle status
- `POST /battle/{id}/segment` - Submit battle segment
- `POST /battle/{id}/complete` - Finalize and judge battle

### User Stats
- `GET /user/stats` - Get comprehensive user statistics

Full API documentation available at `http://localhost:8000/docs` when running locally.

## 🤖 AI-Powered Features

### Scoring System
Gemini AI evaluates your debate performance across four dimensions:

- **Structure (0-5 points)** - Organization, clarity, and coherence
- **Logic (0-5 points)** - Reasoning quality, evidence, and argumentation
- **Delivery (0-5 points)** - Confidence, articulation, and engagement
- **Time Management (0-5 points)** - Pacing, completeness, and efficiency

**Total Score: 0-20 points**

### Feedback Includes:
- 📈 Detailed score breakdown
- 💪 Your key strengths
- 🎯 Areas for improvement
- ⭐ Highlighted best moments with timestamps
- 🏋️ Personalized practice drills

### Battle Judging
In battle mode, AI judges compare both debaters' performance holistically:
- Overall argument quality
- Rebuttal effectiveness
- Consistency and coherence
- Delivery and confidence
- Determines winner objectively

## 🚀 Deployment

<details>
<summary><b>Deploy Backend</b></summary>

**Railway / Render / Fly.io:**

1. Connect your GitHub repository
2. Set environment variables:
   ```
   DATABASE_URL=<your_postgres_url>
   GEMINI_API_KEY=<your_api_key>
   SECRET_KEY=<random_secret>
   ```
3. Deploy automatically from main branch

**Docker:**
```bash
cd backend
docker build -t debaide-backend .
docker run -p 8000:8000 --env-file .env debaide-backend
```

</details>

<details>
<summary><b>Deploy Frontend</b></summary>

**Expo Application Services (EAS):**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS/Android
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

**Web Deployment:**
```bash
npx expo export:web
# Deploy the web-build folder to Vercel, Netlify, or any static host
```

</details>

## 📊 Database Schema

**Core Tables:**
- `users` - User accounts and authentication
- `topics` - Debate topics with difficulty and category
- `sessions` - Practice debate sessions
- `segments` - Audio recordings and transcripts
- `scorecards` - AI feedback and scoring
- `battles` - 1v1 competitive debates
- `battle_segments` - Battle round recordings
- `user_stats` - Performance statistics and rankings

## 🛠️ Built With

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React Native](https://reactnative.dev/) - Cross-platform mobile development
- [Expo](https://expo.dev/) - React Native tooling
- [PostgreSQL](https://www.postgresql.org/) - Relational database
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI scoring and judging
- [Whisper](https://github.com/openai/whisper) - Speech recognition
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [React Query](https://tanstack.com/query) - Server state