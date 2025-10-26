"""
Database models for debAIDe
"""
from sqlalchemy import Column, String, Integer, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """User model for tracking debate participants"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)  # UUID
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    sessions = relationship("Session", back_populates="user")
    player1_battles = relationship("Battle", foreign_keys="Battle.player1_id", back_populates="player1")
    player2_battles = relationship("Battle", foreign_keys="Battle.player2_id", back_populates="player2")
    won_battles = relationship("Battle", foreign_keys="Battle.winner_id", back_populates="winner")
    battle_segments = relationship("BattleSegment", back_populates="player")
    stats = relationship("UserStats", back_populates="user", uselist=False)


class Topic(Base):
    """Debate topics"""
    __tablename__ = "topics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    difficulty = Column(String, default="medium")  # easy, medium, hard
    category = Column(String)  # politics, technology, ethics, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    sessions = relationship("Session", back_populates="topic")


class Session(Base):
    """Debate session"""
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True)  # UUID
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    stance = Column(String, nullable=False)  # 'pro' or 'con'
    status = Column(String, default="in_progress")  # in_progress, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    topic = relationship("Topic", back_populates="sessions")
    user = relationship("User", back_populates="sessions")
    segments = relationship("Segment", back_populates="session", cascade="all, delete-orphan")
    scorecard = relationship("Scorecard", back_populates="session", uselist=False)


class Segment(Base):
    """Audio segment within a debate session"""
    __tablename__ = "segments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    kind = Column(String, nullable=False)  # 'opening', 'rebuttal', 'closing'
    audio_url = Column(String, nullable=True)  # NULL for text-only submissions
    transcript = Column(Text)
    duration = Column(Float, default=0.0)  # in seconds
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("Session", back_populates="segments")


class Scorecard(Base):
    """AI scoring and feedback for a completed debate session"""
    __tablename__ = "scorecards"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, unique=True)
    
    # Scores (0-5 each)
    structure_score = Column(Float, nullable=False)
    logic_score = Column(Float, nullable=False)
    delivery_score = Column(Float, nullable=False)
    time_use_score = Column(Float, nullable=False)
    total_score = Column(Float, nullable=False)  # 0-20
    
    # Feedback
    feedback = Column(JSON)  # Structured feedback from AI
    highlights = Column(JSON)  # Key moments with timestamps
    drills = Column(JSON)  # Recommended practice drills
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("Session", back_populates="scorecard")


class Battle(Base):
    """1v1 Battle between two users"""
    __tablename__ = "battles"
    
    id = Column(String, primary_key=True)  # UUID
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    player1_id = Column(String, ForeignKey("users.id"), nullable=False)
    player2_id = Column(String, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="waiting")  # waiting, in_progress, completed
    winner_id = Column(String, ForeignKey("users.id"), nullable=True)
    player1_stance = Column(String, nullable=False)  # 'pro' or 'con'
    player2_stance = Column(String, nullable=True)  # opposite of player1
    current_turn = Column(String, nullable=True)  # player_id whose turn it is
    current_segment = Column(String, default="opening")  # opening, rebuttal, closing
    judgment = Column(JSON, nullable=True)  # Full judgment from Gemini
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    topic = relationship("Topic")
    player1 = relationship("User", foreign_keys=[player1_id], back_populates="player1_battles")
    player2 = relationship("User", foreign_keys=[player2_id], back_populates="player2_battles")
    winner = relationship("User", foreign_keys=[winner_id], back_populates="won_battles")
    segments = relationship("BattleSegment", back_populates="battle", cascade="all, delete-orphan")


class BattleSegment(Base):
    """Individual segments within a battle"""
    __tablename__ = "battle_segments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    battle_id = Column(String, ForeignKey("battles.id"), nullable=False)
    player_id = Column(String, ForeignKey("users.id"), nullable=False)
    kind = Column(String, nullable=False)  # 'opening', 'rebuttal', 'closing'
    transcript = Column(Text, nullable=False)
    audio_url = Column(String, nullable=True)
    duration = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    battle = relationship("Battle", back_populates="segments")
    player = relationship("User", back_populates="battle_segments")


class UserStats(Base):
    """User statistics and progress tracking"""
    __tablename__ = "user_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Practice session stats
    total_practice_sessions = Column(Integer, default=0)
    completed_practice_sessions = Column(Integer, default=0)
    average_practice_score = Column(Float, default=0.0)
    
    # Battle stats
    total_battles = Column(Integer, default=0)
    battles_won = Column(Integer, default=0)
    battles_lost = Column(Integer, default=0)
    current_win_streak = Column(Integer, default=0)
    best_win_streak = Column(Integer, default=0)
    
    # Skill scores (average from scorecards)
    avg_structure_score = Column(Float, default=0.0)
    avg_logic_score = Column(Float, default=0.0)
    avg_delivery_score = Column(Float, default=0.0)
    avg_time_use_score = Column(Float, default=0.0)
    
    # Activity tracking
    total_debate_time = Column(Float, default=0.0)  # in seconds
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    # Additional metrics
    favorite_stance = Column(String, nullable=True)  # 'pro' or 'con'
    topics_debated = Column(JSON, default={})  # topic_id: count
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="stats")
