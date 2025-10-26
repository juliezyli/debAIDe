"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class SessionStartRequest(BaseModel):
    """Request to start a new debate session"""
    topic_id: int
    user_id: Optional[str] = None


class SessionStartResponse(BaseModel):
    """Response when starting a new session"""
    session_id: str
    topic_title: str
    topic_description: Optional[str] = None
    stance: str  # 'pro' or 'con'


class SegmentUploadResponse(BaseModel):
    """Response after uploading an audio segment"""
    segment_id: int
    transcript: str
    audio_url: str | None  # Optional for text submissions
    duration: float


class ScoreBreakdown(BaseModel):
    """Individual score breakdown"""
    structure: float = Field(..., ge=0, le=5)
    logic: float = Field(..., ge=0, le=5)
    delivery: float = Field(..., ge=0, le=5)
    time_use: float = Field(..., ge=0, le=5)
    total: float = Field(..., ge=0, le=20)


class Highlight(BaseModel):
    """Highlighted moment in the debate"""
    timestamp: float
    text: str
    reason: str


class ScoreResponse(BaseModel):
    """Response after scoring a debate session"""
    session_id: str
    scores: ScoreBreakdown
    feedback: Dict[str, Any]
    highlights: List[Highlight]
    drills: List[Any]  # Can be strings or objects with drill_name/description


class TopicResponse(BaseModel):
    """Debate topic response"""
    id: int
    title: str
    description: Optional[str] = None
    difficulty: str
    category: Optional[str] = None


class TopicGeneration(BaseModel):
    """Generated topic from AI"""
    title: str
    description: str
    difficulty: str
    category: str
