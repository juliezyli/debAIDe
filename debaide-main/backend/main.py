"""
debAIDe - FastAPI Backend
API server for debate practice application
"""
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
import uuid
import random
import os

from database import get_db, init_db
from models import (
    Session as DebateSession, 
    Segment, 
    Scorecard, 
    Topic, 
    User,
    Battle,
    BattleSegment
)
from schemas import (
    SessionStartRequest,
    SessionStartResponse,
    SegmentUploadResponse,
    ScoreResponse,
    ScoreBreakdown,
    TopicResponse
)
from services.gemini_service import GeminiService
from services.storage_service import StorageService
from services.stt_service import STTService
from services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    await init_db()
    yield


app = FastAPI(
    title="debAIDe API",
    description="AI-powered debate practice platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
gemini_service = GeminiService()
storage_service = StorageService()
stt_service = STTService()

# Security
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "debAIDe API",
        "version": "1.0.0"
    }


# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

@app.post("/auth/register")
async def register(
    username: str,
    email: str,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user"""
    from sqlalchemy import select
    
    # Check if username exists
    result = await db.execute(select(User).where(User.username == username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Check if email exists
    result = await db.execute(select(User).where(User.email == email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user = User(
        id=str(uuid.uuid4()),
        username=username,
        email=email,
        hashed_password=get_password_hash(password)
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Create initial stats for user
    from models import UserStats
    stats = UserStats(user_id=user.id)
    db.add(stats)
    await db.commit()
    
    # Generate token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }


@app.post("/auth/login")
async def login(
    username: str,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Login user"""
    from sqlalchemy import select
    
    # Find user by username
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Generate token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }


@app.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at
    }


# ============================================================================
# USER STATS ENDPOINTS
# ============================================================================


@app.get("/user/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user statistics"""
    from sqlalchemy import select
    from models import UserStats
    
    # Get or create user stats
    result = await db.execute(select(UserStats).where(UserStats.user_id == current_user.id))
    stats = result.scalars().first()
    
    if not stats:
        # Create initial stats for user
        stats = UserStats(user_id=current_user.id)
        db.add(stats)
        await db.commit()
        await db.refresh(stats)
    
    return {
        "user_id": stats.user_id,
        "username": current_user.username,
        "total_practice_sessions": stats.total_practice_sessions,
        "completed_practice_sessions": stats.completed_practice_sessions,
        "average_practice_score": round(stats.average_practice_score, 2),
        "total_battles": stats.total_battles,
        "battles_won": stats.battles_won,
        "battles_lost": stats.battles_lost,
        "win_rate": round((stats.battles_won / stats.total_battles * 100) if stats.total_battles > 0 else 0, 1),
        "current_win_streak": stats.current_win_streak,
        "best_win_streak": stats.best_win_streak,
        "skill_scores": {
            "structure": round(stats.avg_structure_score, 2),
            "logic": round(stats.avg_logic_score, 2),
            "delivery": round(stats.avg_delivery_score, 2),
            "time_use": round(stats.avg_time_use_score, 2)
        },
        "total_debate_time": round(stats.total_debate_time / 60, 1),  # Convert to minutes
        "last_activity": stats.last_activity,
        "favorite_stance": stats.favorite_stance,
        "member_since": current_user.created_at
    }


async def update_user_stats_for_practice(user_id: str, scorecard: Scorecard, db: AsyncSession):
    """Update user stats after completing a practice session"""
    from sqlalchemy import select
    from models import UserStats
    from sqlalchemy.sql import func
    
    result = await db.execute(select(UserStats).where(UserStats.user_id == user_id))
    stats = result.scalars().first()
    
    if not stats:
        stats = UserStats(user_id=user_id)
        db.add(stats)
    
    # Update practice session counts
    stats.total_practice_sessions += 1
    stats.completed_practice_sessions += 1
    
    # Update average scores
    total_completed = stats.completed_practice_sessions
    stats.avg_structure_score = ((stats.avg_structure_score * (total_completed - 1)) + scorecard.structure_score) / total_completed
    stats.avg_logic_score = ((stats.avg_logic_score * (total_completed - 1)) + scorecard.logic_score) / total_completed
    stats.avg_delivery_score = ((stats.avg_delivery_score * (total_completed - 1)) + scorecard.delivery_score) / total_completed
    stats.avg_time_use_score = ((stats.avg_time_use_score * (total_completed - 1)) + scorecard.time_use_score) / total_completed
    stats.average_practice_score = ((stats.average_practice_score * (total_completed - 1)) + scorecard.total_score) / total_completed
    
    # Update activity
    stats.last_activity = func.now()
    
    await db.commit()


async def update_user_stats_for_battle(battle: Battle, db: AsyncSession):
    """Update user stats after completing a battle"""
    from sqlalchemy import select
    from models import UserStats
    from sqlalchemy.sql import func
    
    # Update stats for both players
    for player_id in [battle.player1_id, battle.player2_id]:
        if not player_id:
            continue
            
        result = await db.execute(select(UserStats).where(UserStats.user_id == player_id))
        stats = result.scalars().first()
        
        if not stats:
            stats = UserStats(user_id=player_id)
            db.add(stats)
        
        # Update battle counts
        stats.total_battles += 1
        
        if battle.winner_id == player_id:
            stats.battles_won += 1
            stats.current_win_streak += 1
            stats.best_win_streak = max(stats.best_win_streak, stats.current_win_streak)
        else:
            stats.battles_lost += 1
            stats.current_win_streak = 0
        
        # Update activity
        stats.last_activity = func.now()
    
    await db.commit()


# ============================================================================
# TOPIC ENDPOINTS
# ============================================================================


@app.get("/topics", response_model=list[TopicResponse])
async def get_topics(db: AsyncSession = Depends(get_db)):
    """Get all debate topics"""
    from sqlalchemy import select
    
    result = await db.execute(select(Topic))
    topics = result.scalars().all()
    
    return [
        TopicResponse(
            id=topic.id,
            title=topic.title,
            description=topic.description,
            difficulty=topic.difficulty,
            category=topic.category
        )
        for topic in topics
    ]


@app.get("/topics/daily", response_model=TopicResponse)
async def get_daily_topic(db: AsyncSession = Depends(get_db)):
    """Get AI-generated topic of the day"""
    from sqlalchemy import select, func
    from datetime import date
    
    # Check if we have a topic for today
    today = date.today()
    result = await db.execute(
        select(Topic).where(Topic.created_at >= today).order_by(Topic.created_at.desc())
    )
    topic = result.scalars().first()
    
    if topic:
        return TopicResponse(
            id=topic.id,
            title=topic.title,
            description=topic.description,
            difficulty=topic.difficulty,
            category=topic.category
        )
    
    # Generate new topic using Gemini
    generated_topic = await gemini_service.generate_daily_topic()
    
    # Save to database
    new_topic = Topic(
        title=generated_topic["title"],
        description=generated_topic["description"],
        difficulty=generated_topic["difficulty"],
        category=generated_topic["category"]
    )
    db.add(new_topic)
    await db.commit()
    await db.refresh(new_topic)
    
    return TopicResponse(
        id=new_topic.id,
        title=new_topic.title,
        description=new_topic.description,
        difficulty=new_topic.difficulty,
        category=new_topic.category
    )


@app.post("/session/start", response_model=SessionStartResponse)
async def start_session(
    request: SessionStartRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start a new debate session"""
    from sqlalchemy import select
    
    # Verify topic exists
    result = await db.execute(select(Topic).where(Topic.id == request.topic_id))
    topic = result.scalars().first()
    
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Randomly assign stance
    stance = random.choice(["pro", "con"])
    session_id = str(uuid.uuid4())
    
    # Create session
    session = DebateSession(
        id=session_id,
        topic_id=request.topic_id,
        stance=stance,
        user_id=request.user_id
    )
    
    db.add(session)
    await db.commit()
    
    return SessionStartResponse(
        session_id=session_id,
        topic_title=topic.title,
        stance=stance,
        topic_description=topic.description
    )


@app.post("/segment/upload", response_model=SegmentUploadResponse)
async def upload_segment(
    session_id: str,
    kind: str,  # 'opening', 'rebuttal', 'closing'
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload and process an audio segment"""
    from sqlalchemy import select
    
    # Verify session exists
    result = await db.execute(
        select(DebateSession).where(DebateSession.id == session_id)
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Validate segment kind
    if kind not in ['opening', 'rebuttal', 'closing']:
        raise HTTPException(status_code=400, detail="Invalid segment kind")
    
    try:
        # Upload audio to storage
        audio_url = await storage_service.upload_audio(file, session_id, kind)
        
        # Transcribe audio
        transcript = await stt_service.transcribe(audio_url)
        
        # Save segment
        segment = Segment(
            session_id=session_id,
            kind=kind,
            audio_url=audio_url,
            transcript=transcript["text"],
            duration=transcript.get("duration", 0)
        )
        
        db.add(segment)
        await db.commit()
        await db.refresh(segment)
        
        return SegmentUploadResponse(
            segment_id=segment.id,
            transcript=segment.transcript,
            audio_url=audio_url,
            duration=segment.duration
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/segment/text", response_model=SegmentUploadResponse)
async def submit_text_segment(
    session_id: str,
    kind: str,
    text: str,
    db: AsyncSession = Depends(get_db)
):
    """Submit a text-based debate segment (without audio recording)"""
    from sqlalchemy import select
    
    # Verify session exists
    result = await db.execute(
        select(DebateSession).where(DebateSession.id == session_id)
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Validate segment kind
    if kind not in ['opening', 'rebuttal', 'closing']:
        raise HTTPException(status_code=400, detail="Invalid segment kind")
    
    try:
        if not text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Calculate approximate duration (150 words per minute speaking rate)
        word_count = len(text.split())
        duration = (word_count / 150) * 60
        
        # Save segment (no audio URL for text submissions)
        segment = Segment(
            session_id=session_id,
            kind=kind,
            audio_url=None,
            transcript=text,
            duration=duration
        )
        
        db.add(segment)
        await db.commit()
        await db.refresh(segment)
        
        return SegmentUploadResponse(
            segment_id=segment.id,
            transcript=segment.transcript,
            audio_url=None,
            duration=segment.duration
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text submission failed: {str(e)}")


@app.post("/session/score", response_model=ScoreResponse)
async def score_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Score a completed debate session"""
    from sqlalchemy import select
    
    # Get session with all segments
    result = await db.execute(
        select(DebateSession).where(DebateSession.id == session_id)
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all segments
    result = await db.execute(
        select(Segment).where(Segment.session_id == session_id)
    )
    segments = result.scalars().all()
    
    if not segments:
        raise HTTPException(status_code=400, detail="No segments found for session")
    
    # Get topic
    result = await db.execute(select(Topic).where(Topic.id == session.topic_id))
    topic = result.scalars().first()
    
    # Prepare data for Gemini
    session_data = {
        "topic": topic.title,
        "stance": session.stance,
        "segments": [
            {
                "kind": seg.kind,
                "transcript": seg.transcript,
                "duration": seg.duration
            }
            for seg in segments
        ]
    }
    
    try:
        # Check if scorecard already exists
        result = await db.execute(
            select(Scorecard).where(Scorecard.session_id == session_id)
        )
        existing_scorecard = result.scalars().first()
        
        if existing_scorecard:
            # Return existing scorecard
            return ScoreResponse(
                session_id=session_id,
                scores=ScoreBreakdown(
                    structure=existing_scorecard.structure_score,
                    logic=existing_scorecard.logic_score,
                    delivery=existing_scorecard.delivery_score,
                    time_use=existing_scorecard.time_use_score,
                    total=existing_scorecard.total_score
                ),
                feedback=existing_scorecard.feedback,
                highlights=existing_scorecard.highlights,
                drills=existing_scorecard.drills
            )
        
        # Get AI scoring
        scoring_result = await gemini_service.score_debate(session_data)
        
        # Save scorecard
        scorecard = Scorecard(
            session_id=session_id,
            structure_score=scoring_result["scores"]["structure"],
            logic_score=scoring_result["scores"]["logic"],
            delivery_score=scoring_result["scores"]["delivery"],
            time_use_score=scoring_result["scores"]["time_use"],
            total_score=scoring_result["scores"]["total"],
            feedback=scoring_result["feedback"],
            highlights=scoring_result.get("highlights", []),
            drills=scoring_result.get("drills", [])
        )
        
        db.add(scorecard)
        session.status = "completed"
        await db.commit()
        await db.refresh(scorecard)
        
        # Update user stats after completing practice session
        if session.user_id:
            await update_user_stats_for_practice(session.user_id, scorecard, db)
        
        return ScoreResponse(
            session_id=session_id,
            scores=ScoreBreakdown(**scoring_result["scores"]),
            feedback=scoring_result["feedback"],
            highlights=scoring_result.get("highlights", []),
            drills=scoring_result.get("drills", [])
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


@app.get("/session/{session_id}/history")
async def get_session_history(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get complete session history with segments and scores"""
    from sqlalchemy import select
    
    result = await db.execute(
        select(DebateSession).where(DebateSession.id == session_id)
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get segments
    result = await db.execute(
        select(Segment).where(Segment.session_id == session_id)
    )
    segments = result.scalars().all()
    
    # Get scorecard
    result = await db.execute(
        select(Scorecard).where(Scorecard.session_id == session_id)
    )
    scorecard = result.scalars().first()
    
    return {
        "session": {
            "id": session.id,
            "topic_id": session.topic_id,
            "stance": session.stance,
            "status": session.status,
            "created_at": session.created_at
        },
        "segments": [
            {
                "id": seg.id,
                "kind": seg.kind,
                "transcript": seg.transcript,
                "audio_url": seg.audio_url,
                "duration": seg.duration
            }
            for seg in segments
        ],
        "scorecard": {
            "scores": {
                "structure": scorecard.structure_score,
                "logic": scorecard.logic_score,
                "delivery": scorecard.delivery_score,
                "time_use": scorecard.time_use_score,
                "total": scorecard.total_score
            },
            "feedback": scorecard.feedback,
            "highlights": scorecard.highlights,
            "drills": scorecard.drills
        } if scorecard else None
    }


# ============================================================================
# BATTLE ENDPOINTS (1v1 Mode)
# ============================================================================

@app.post("/battle/create")
async def create_battle(
    topic_id: int,
    stance: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new battle room"""
    from sqlalchemy import select, delete
    
    # Verify topic exists
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalars().first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Validate stance
    if stance not in ['pro', 'con']:
        raise HTTPException(status_code=400, detail="Stance must be 'pro' or 'con'")
    
    # Delete any existing battles created by this user that are still in "waiting" status
    await db.execute(
        delete(Battle).where(
            Battle.player1_id == current_user.id,
            Battle.status == "waiting"
        )
    )
    await db.commit()
    
    # Create battle
    battle = Battle(
        id=str(uuid.uuid4()),
        topic_id=topic_id,
        player1_id=current_user.id,
        player1_stance=stance,
        status="waiting",
        current_segment="opening",
        current_turn=current_user.id  # Player 1 starts
    )
    
    db.add(battle)
    await db.commit()
    await db.refresh(battle)
    
    return {
        "battle_id": battle.id,
        "topic": {
            "id": topic.id,
            "title": topic.title,
            "description": topic.description
        },
        "player1": {
            "id": current_user.id,
            "username": current_user.username,
            "stance": stance
        },
        "status": "waiting"
    }


@app.post("/battle/{battle_id}/join")
async def join_battle(
    battle_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Join an existing battle as player 2"""
    from sqlalchemy import select
    
    # Get battle
    result = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = result.scalars().first()
    
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    if battle.status != "waiting":
        raise HTTPException(status_code=400, detail="Battle is not accepting players")
    
    if battle.player1_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot join your own battle")
    
    if battle.player2_id:
        raise HTTPException(status_code=400, detail="Battle is full")
    
    # Join battle
    battle.player2_id = current_user.id
    battle.player2_stance = "con" if battle.player1_stance == "pro" else "pro"
    battle.status = "in_progress"
    # Keep current_turn as player1_id (already set in create_battle)
    
    await db.commit()
    await db.refresh(battle)
    
    # Get player1 info
    result = await db.execute(select(User).where(User.id == battle.player1_id))
    player1 = result.scalars().first()
    
    # Get topic info
    result = await db.execute(select(Topic).where(Topic.id == battle.topic_id))
    topic = result.scalars().first()
    
    return {
        "battle_id": battle.id,
        "topic": {
            "id": topic.id,
            "title": topic.title,
            "description": topic.description
        },
        "player1": {
            "id": player1.id,
            "username": player1.username,
            "stance": battle.player1_stance
        },
        "player2": {
            "id": current_user.id,
            "username": current_user.username,
            "stance": battle.player2_stance
        },
        "status": "in_progress"
    }


@app.get("/battle/available")
async def get_available_battles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of available battles to join"""
    from sqlalchemy import select
    
    result = await db.execute(
        select(Battle)
        .where(Battle.status == "waiting")
        .where(Battle.player1_id != current_user.id)
    )
    battles = result.scalars().all()
    
    battle_list = []
    for battle in battles:
        # Get topic
        topic_result = await db.execute(select(Topic).where(Topic.id == battle.topic_id))
        topic = topic_result.scalars().first()
        
        # Get player1
        player_result = await db.execute(select(User).where(User.id == battle.player1_id))
        player1 = player_result.scalars().first()
        
        battle_list.append({
            "battle_id": battle.id,
            "topic": {
                "id": topic.id,
                "title": topic.title,
                "difficulty": topic.difficulty
            },
            "player1": {
                "username": player1.username,
                "stance": battle.player1_stance
            },
            "created_at": battle.created_at
        })
    
    return battle_list


@app.get("/battle/{battle_id}/status")
async def get_battle_status(
    battle_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current battle status including turn and segment info"""
    from sqlalchemy import select
    
    # Get battle
    result = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = result.scalars().first()
    
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    # Verify user is a participant
    if current_user.id not in [battle.player1_id, battle.player2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this battle")
    
    # Get all segments
    result = await db.execute(
        select(BattleSegment).where(BattleSegment.battle_id == battle_id)
    )
    segments = result.scalars().all()
    
    # Get player info
    player1_result = await db.execute(select(User).where(User.id == battle.player1_id))
    player1 = player1_result.scalars().first()
    
    player2_result = await db.execute(select(User).where(User.id == battle.player2_id))
    player2 = player2_result.scalars().first() if battle.player2_id else None
    
    # Get topic
    topic_result = await db.execute(select(Topic).where(Topic.id == battle.topic_id))
    topic = topic_result.scalars().first()
    
    # Count segments by player and type
    player1_segments = {}
    player2_segments = {}
    for seg in segments:
        if seg.player_id == battle.player1_id:
            player1_segments[seg.kind] = True
        elif seg.player_id == battle.player2_id:
            player2_segments[seg.kind] = True
    
    return {
        "battle_id": battle.id,
        "status": battle.status,
        "current_turn": battle.current_turn,
        "current_segment": battle.current_segment,
        "topic": {
            "id": topic.id,
            "title": topic.title,
            "description": topic.description
        },
        "player1": {
            "id": player1.id,
            "username": player1.username,
            "stance": battle.player1_stance,
            "segments": player1_segments
        },
        "player2": {
            "id": player2.id if player2 else None,
            "username": player2.username if player2 else None,
            "stance": battle.player2_stance,
            "segments": player2_segments
        } if player2 else None,
        "is_your_turn": battle.current_turn == current_user.id,
        "winner_id": battle.winner_id,
        "judgment": battle.judgment
    }


@app.get("/battle/{battle_id}/segments")
async def get_battle_segments(
    battle_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all segments for a battle"""
    from sqlalchemy import select
    
    # Get battle
    result = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = result.scalars().first()
    
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    # Verify user is a participant
    if current_user.id not in [battle.player1_id, battle.player2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this battle")
    
    # Get all segments
    result = await db.execute(
        select(BattleSegment).where(BattleSegment.battle_id == battle_id)
    )
    segments = result.scalars().all()
    
    return [
        {
            "kind": seg.kind,
            "transcript": seg.transcript,
            "player_id": seg.player_id,
            "created_at": seg.created_at
        }
        for seg in segments
    ]


@app.post("/battle/{battle_id}/segment")
async def submit_battle_segment(
    battle_id: str,
    kind: str,
    text: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a segment in a battle"""
    from sqlalchemy import select
    
    # Get battle
    result = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = result.scalars().first()
    
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    if battle.status != "in_progress":
        raise HTTPException(status_code=400, detail="Battle is not in progress")
    
    # Verify user is a participant
    if current_user.id not in [battle.player1_id, battle.player2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this battle")
    
    # Check if it's the user's turn
    if battle.current_turn != current_user.id:
        raise HTTPException(status_code=400, detail="It's not your turn")
    
    # Validate kind matches current segment
    if kind != battle.current_segment:
        raise HTTPException(status_code=400, detail=f"Current segment is {battle.current_segment}, not {kind}")
    
    # Validate kind
    if kind not in ['opening', 'rebuttal', 'closing']:
        raise HTTPException(status_code=400, detail="Invalid segment kind")
    
    # Calculate duration
    word_count = len(text.split())
    duration = (word_count / 150) * 60
    
    # Create segment
    segment = BattleSegment(
        battle_id=battle_id,
        player_id=current_user.id,
        kind=kind,
        transcript=text,
        audio_url=None,
        duration=duration
    )
    
    db.add(segment)
    
    # Switch turn to other player
    battle.current_turn = battle.player2_id if current_user.id == battle.player1_id else battle.player1_id
    
    # Check if both players have submitted this segment type
    result = await db.execute(
        select(BattleSegment).where(
            BattleSegment.battle_id == battle_id,
            BattleSegment.kind == kind
        )
    )
    segments_of_kind = result.scalars().all()
    
    # If both players submitted, advance to next segment
    if len(segments_of_kind) >= 2:  # Will be 2 after this commit
        if kind == "opening":
            battle.current_segment = "rebuttal"
            battle.current_turn = battle.player1_id  # Player 1 starts rebuttal
        elif kind == "rebuttal":
            battle.current_segment = "closing"
            battle.current_turn = battle.player1_id  # Player 1 starts closing
        # If closing, both players have finished, current_segment stays "closing"
    
    await db.commit()
    await db.refresh(segment)
    await db.refresh(battle)
    
    return {
        "segment_id": segment.id,
        "kind": kind,
        "transcript": text,
        "duration": duration,
        "current_turn": battle.current_turn,
        "current_segment": battle.current_segment
    }


@app.post("/battle/{battle_id}/judge")
async def judge_battle(
    battle_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Use Gemini to judge the battle and determine winner"""
    from sqlalchemy import select, func
    
    # Get battle
    result = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = result.scalars().first()
    
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    if battle.status != "in_progress":
        raise HTTPException(status_code=400, detail="Battle is not in progress")
    
    # Verify user is a participant
    if current_user.id not in [battle.player1_id, battle.player2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this battle")
    
    # Get all segments
    result = await db.execute(
        select(BattleSegment)
        .where(BattleSegment.battle_id == battle_id)
        .order_by(BattleSegment.created_at)
    )
    segments = result.scalars().all()
    
    # Organize segments by player
    player1_segments = {}
    player2_segments = {}
    
    for seg in segments:
        if seg.player_id == battle.player1_id:
            player1_segments[seg.kind] = seg.transcript
        else:
            player2_segments[seg.kind] = seg.transcript
    
    # Check if all segments are submitted
    required_kinds = ['opening', 'rebuttal', 'closing']
    if not all(k in player1_segments for k in required_kinds):
        raise HTTPException(status_code=400, detail="Player 1 has not submitted all segments")
    if not all(k in player2_segments for k in required_kinds):
        raise HTTPException(status_code=400, detail="Player 2 has not submitted all segments")
    
    # Get topic
    result = await db.execute(select(Topic).where(Topic.id == battle.topic_id))
    topic = result.scalars().first()
    
    # Get player names
    result = await db.execute(select(User).where(User.id == battle.player1_id))
    player1 = result.scalars().first()
    result = await db.execute(select(User).where(User.id == battle.player2_id))
    player2 = result.scalars().first()
    
    # Create judgment prompt
    prompt = f"""You are an expert debate judge evaluating a 1v1 debate.

Topic: {topic.title}
Description: {topic.description}

{player1.username} ({battle.player1_stance}):
Opening: {player1_segments['opening']}
Rebuttal: {player1_segments['rebuttal']}
Closing: {player1_segments['closing']}

{player2.username} ({battle.player2_stance}):
Opening: {player2_segments['opening']}
Rebuttal: {player2_segments['rebuttal']}
Closing: {player2_segments['closing']}

Evaluate both debaters on these criteria (0-10 points each):
1. Argument Strength - Quality and persuasiveness of arguments
2. Logic and Reasoning - Sound logic and valid reasoning
3. Evidence and Examples - Use of facts, data, and relevant examples
4. Rebuttal Quality - Effective counter-arguments and addressing opponent's points
5. Delivery and Clarity - Clear communication and structure

Provide your judgment in the following JSON format:
{{
  "player1_scores": {{
    "argument_strength": <0-10>,
    "logic_reasoning": <0-10>,
    "evidence": <0-10>,
    "rebuttal": <0-10>,
    "delivery": <0-10>,
    "total": <sum of all scores>
  }},
  "player2_scores": {{
    "argument_strength": <0-10>,
    "logic_reasoning": <0-10>,
    "evidence": <0-10>,
    "rebuttal": <0-10>,
    "delivery": <0-10>,
    "total": <sum of all scores>
  }},
  "winner": "<player1 or player2>",
  "decision_summary": "<2-3 sentences explaining the decision>",
  "player1_strengths": ["strength1", "strength2"],
  "player1_weaknesses": ["weakness1", "weakness2"],
  "player2_strengths": ["strength1", "strength2"],
  "player2_weaknesses": ["weakness1", "weakness2"]
}}

Return ONLY the JSON object, no additional text."""
    
    # Get judgment from Gemini
    import json
    judgment_text = await gemini_service.generate_text(prompt, response_format="json")
    
    # Parse JSON (remove markdown code blocks if present)
    judgment_text = judgment_text.strip()
    if judgment_text.startswith("```json"):
        judgment_text = judgment_text[7:]
    if judgment_text.startswith("```"):
        judgment_text = judgment_text[3:]
    if judgment_text.endswith("```"):
        judgment_text = judgment_text[:-3]
    judgment_text = judgment_text.strip()
    
    judgment = json.loads(judgment_text)
    
    # Determine winner
    winner_id = battle.player1_id if judgment["winner"] == "player1" else battle.player2_id
    
    # Update battle
    battle.status = "completed"
    battle.winner_id = winner_id
    battle.judgment = judgment
    battle.completed_at = func.now()
    
    await db.commit()
    
    # Update user stats for both players
    await update_user_stats_for_battle(battle, db)
    
    return {
        "battle_id": battle.id,
        "winner": {
            "id": winner_id,
            "username": player1.username if winner_id == battle.player1_id else player2.username
        },
        "judgment": judgment
    }


@app.post("/stt/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Transcribe audio file to text using Whisper
    """
    import tempfile
    import shutil
    
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.m4a') as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
        
        # Transcribe using Whisper
        result = await stt_service._transcribe_with_whisper(temp_path)
        
        # Clean up temp file
        try:
            os.remove(temp_path)
        except Exception as e:
            print(f"Failed to clean up temp file: {e}")
        
        return {"text": result["text"]}
        
    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
