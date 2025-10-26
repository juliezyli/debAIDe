"""
Seed script to populate database with initial debate topics
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from database import AsyncSessionLocal, init_db
from models import Topic


async def seed_topics():
    """Add initial debate topics to database"""
    
    initial_topics = [
        {
            "title": "Social media does more harm than good",
            "description": "Examine the impact of social media on mental health, democracy, and social connections.",
            "difficulty": "medium",
            "category": "technology"
        },
        {
            "title": "Remote work should be the default for office jobs",
            "description": "Debate the future of work considering productivity, work-life balance, and company culture.",
            "difficulty": "easy",
            "category": "economics"
        },
        {
            "title": "Artificial intelligence poses an existential threat to humanity",
            "description": "Discuss AI safety, regulation, and the long-term implications of advanced AI systems.",
            "difficulty": "hard",
            "category": "technology"
        },
        {
            "title": "College education should be free for all citizens",
            "description": "Explore the economic impact, accessibility, and value of higher education.",
            "difficulty": "medium",
            "category": "education"
        },
        {
            "title": "Climate change is primarily caused by human activity",
            "description": "Evaluate scientific evidence and debate policy responses to environmental challenges.",
            "difficulty": "medium",
            "category": "environment"
        },
        {
            "title": "Universal basic income would benefit society",
            "description": "Analyze the economic feasibility and social impact of guaranteed income programs.",
            "difficulty": "hard",
            "category": "economics"
        },
        {
            "title": "Video games contribute to violent behavior",
            "description": "Examine research on gaming's psychological effects and media influence on behavior.",
            "difficulty": "easy",
            "category": "ethics"
        },
        {
            "title": "Privacy is more important than security",
            "description": "Debate the balance between civil liberties and safety in the digital age.",
            "difficulty": "medium",
            "category": "politics"
        },
        {
            "title": "Nuclear energy is essential for fighting climate change",
            "description": "Weigh the benefits and risks of nuclear power as a clean energy source.",
            "difficulty": "hard",
            "category": "environment"
        },
        {
            "title": "Standardized testing accurately measures student ability",
            "description": "Evaluate testing methods and their role in education assessment and college admissions.",
            "difficulty": "easy",
            "category": "education"
        }
    ]
    
    # Initialize database
    await init_db()
    
    # Create session
    async with AsyncSessionLocal() as session:
        # Check if topics already exist
        from sqlalchemy import select
        result = await session.execute(select(Topic))
        existing_topics = result.scalars().all()
        
        if existing_topics:
            print(f"Database already has {len(existing_topics)} topics. Skipping seed.")
            return
        
        # Add topics
        for topic_data in initial_topics:
            topic = Topic(**topic_data)
            session.add(topic)
        
        await session.commit()
        print(f"✅ Successfully seeded {len(initial_topics)} debate topics!")


if __name__ == "__main__":
    asyncio.run(seed_topics())
