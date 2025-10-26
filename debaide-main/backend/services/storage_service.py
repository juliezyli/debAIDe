"""
Storage service for audio file management
"""
import os
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
import uuid
from typing import Optional


class StorageService:
    """Service for managing audio file storage"""
    
    def __init__(self):
        self.use_s3 = os.getenv("USE_S3", "false").lower() == "true"
        
        if self.use_s3:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                region_name=os.getenv("AWS_REGION", "us-east-1")
            )
            self.bucket_name = os.getenv("S3_BUCKET_NAME")
        else:
            # Local file storage
            self.local_storage_path = os.getenv(
                "LOCAL_STORAGE_PATH",
                "./storage/audio"
            )
            os.makedirs(self.local_storage_path, exist_ok=True)
    
    async def upload_audio(
        self,
        file: UploadFile,
        session_id: str,
        segment_kind: str
    ) -> str:
        """
        Upload audio file to storage
        
        Args:
            file: Uploaded audio file
            session_id: Session identifier
            segment_kind: Type of segment (opening, rebuttal, closing)
        
        Returns:
            URL or path to the stored file
        """
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if file.filename else 'webm'
        filename = f"{session_id}/{segment_kind}_{uuid.uuid4()}.{file_extension}"
        
        if self.use_s3:
            return await self._upload_to_s3(file, filename)
        else:
            return await self._upload_to_local(file, filename)
    
    async def _upload_to_s3(self, file: UploadFile, filename: str) -> str:
        """Upload file to S3"""
        try:
            # Read file content
            content = await file.read()
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=filename,
                Body=content,
                ContentType=file.content_type or 'audio/webm'
            )
            
            # Generate URL
            url = f"https://{self.bucket_name}.s3.amazonaws.com/{filename}"
            return url
            
        except ClientError as e:
            raise Exception(f"S3 upload failed: {e}")
    
    async def _upload_to_local(self, file: UploadFile, filename: str) -> str:
        """Upload file to local storage"""
        try:
            # Create directory if needed
            file_path = os.path.join(self.local_storage_path, filename)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Write file
            content = await file.read()
            with open(file_path, 'wb') as f:
                f.write(content)
            
            # Return relative path or URL
            return f"/storage/audio/{filename}"
            
        except Exception as e:
            raise Exception(f"Local storage failed: {e}")
    
    def get_file_url(self, file_path: str) -> str:
        """Get accessible URL for a stored file"""
        if self.use_s3:
            return file_path  # Already a full URL
        else:
            # For local storage, return API endpoint
            base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
            return f"{base_url}{file_path}"
