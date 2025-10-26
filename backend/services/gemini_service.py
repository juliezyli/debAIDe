"""
Gemini AI service for scoring, feedback, and topic generation
"""
import os
import json
import google.generativeai as genai
from typing import Dict, Any, List


class GeminiService:
    """Service for interacting with Google Gemini API"""
    
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("⚠️  Warning: GEMINI_API_KEY not set. AI features will return mock data.")
            self.model = None
        else:
            try:
                genai.configure(api_key=api_key)
                # Use gemini-2.0-flash which is available and stable
                self.model = genai.GenerativeModel('gemini-2.0-flash')
                print("✅ Gemini AI initialized successfully")
            except Exception as e:
                print(f"⚠️  Warning: Invalid GEMINI_API_KEY. AI features will return mock data. Error: {e}")
                self.model = None
    
    async def score_debate(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Score a debate session using Gemini
        
        Args:
            session_data: Dict with topic, stance, and segments
        
        Returns:
            Dict with scores, feedback, highlights, and drills
        """
        # Return mock data if no valid model
        if not self.model:
            print("ℹ️  Using mock scoring (no valid Gemini API key)")
            return self._fallback_scoring()
        
        prompt = self._build_scoring_prompt(session_data)
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.7
                )
            )
            
            result = json.loads(response.text)
            return result
            
        except Exception as e:
            print(f"❌ Gemini scoring error: {e}")
            return self._fallback_scoring()
    
    async def generate_text(self, prompt: str, response_format: str = "text") -> str:
        """
        Generate text using Gemini with a given prompt
        
        Args:
            prompt: The prompt to send to Gemini
            response_format: "text" or "json" for response format
        
        Returns:
            Generated text response
        """
        if not self.model:
            print("ℹ️  Using mock text generation (no valid Gemini API key)")
            return '{"error": "No Gemini API key configured"}'
        
        try:
            config_params = {"temperature": 0.7}
            if response_format == "json":
                config_params["response_mime_type"] = "application/json"
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(**config_params)
            )
            
            return response.text
            
        except Exception as e:
            print(f"❌ Gemini text generation error: {e}")
            return f'{{"error": "{str(e)}"}}'
    
    async def generate_daily_topic(self) -> Dict[str, str]:
        """
        Generate a debate topic of the day using Gemini
        
        Returns:
            Dict with title, description, difficulty, and category
        """
        # Return mock topic if no valid model
        if not self.model:
            print("ℹ️  Using mock topic (no valid Gemini API key)")
            return {
                "title": "Artificial intelligence will improve quality of life more than it will harm it",
                "description": "This topic explores the balance between AI's benefits and risks as it becomes increasingly integrated into daily life.",
                "difficulty": "medium",
                "category": "technology"
            }
        
        prompt = """
Generate an engaging debate topic for practice. Return a JSON object with:
- title: A clear, specific debate resolution (e.g., "Social media does more harm than good")
- description: 2-3 sentence explanation of the topic's relevance
- difficulty: "easy", "medium", or "hard"
- category: one of "politics", "technology", "ethics", "environment", "education", "health", "economics"

Make it current, relevant, and suitable for practicing argumentation skills.
        """
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.9
                )
            )
            
            result = json.loads(response.text)
            return result
            
        except Exception as e:
            print(f"Gemini topic generation error: {e}")
            # Return fallback topic
            return {
                "title": "Artificial intelligence will improve quality of life more than it will harm it",
                "description": "This topic explores the balance between AI's benefits and risks as it becomes increasingly integrated into daily life.",
                "difficulty": "medium",
                "category": "technology"
            }
    
    def _build_scoring_prompt(self, session_data: Dict[str, Any]) -> str:
        """Build the prompt for debate scoring"""
        segments_text = "\n\n".join([
            f"**{seg['kind'].upper()}** ({seg['duration']}s):\n{seg['transcript']}"
            for seg in session_data["segments"]
        ])
        
        prompt = f"""
You are an expert debate coach scoring a practice debate. Analyze the following debate performance.

**Topic:** {session_data['topic']}
**Stance:** {session_data['stance']}

**Debate Transcript:**
{segments_text}

Provide a structured evaluation in JSON format with:

1. **scores** (object):
   - structure: 0-5 (organization, clarity of arguments)
   - logic: 0-5 (reasoning, evidence, coherence)
   - delivery: 0-5 (confidence, pace, articulation)
   - time_use: 0-5 (pacing, time management)
   - total: 0-20 (sum of above)

2. **feedback** (object with detailed coaching):
   - strengths: List 2-3 specific strengths
   - improvements: List 2-3 areas to improve
   - summary: 2-3 sentence overall assessment

3. **highlights** (array of 2-3 key moments):
   Each with: timestamp (float seconds), text (key phrase), reason (why it's notable)

4. **drills** (array of 3-4 practice exercises):
   Specific, actionable drills to improve weak areas

Be constructive, specific, and encouraging. Focus on actionable feedback.
        """
        
        return prompt
    
    def _fallback_scoring(self) -> Dict[str, Any]:
        """Fallback scoring if Gemini fails"""
        return {
            "scores": {
                "structure": 3.0,
                "logic": 3.0,
                "delivery": 3.0,
                "time_use": 3.0,
                "total": 12.0
            },
            "feedback": {
                "strengths": ["You completed all segments", "Good effort"],
                "improvements": ["Practice more", "Work on clarity"],
                "summary": "Keep practicing to improve your debate skills."
            },
            "highlights": [],
            "drills": [
                "Practice outlining arguments in advance",
                "Record yourself and listen back",
                "Time your segments during practice"
            ]
        }
