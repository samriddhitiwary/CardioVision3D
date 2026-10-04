import logging
from typing import Optional
from backend.app.core.supabase_client import get_supabase_client
from supabase import Client

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.supabase: Client = get_supabase_client()
        self.bucket_name = "patient-reports"

    def upload_pdf_bytes(self, file_bytes: bytes, file_name: str) -> Optional[str]:
        """
        Uploads a PDF byte array to the configured Supabase Storage Bucket.
        Returns the public URL of the uploaded file.
        """
        try:
            # Upload the file bytes
            # content_type ensures the browser handles it as a PDF
            res = self.supabase.storage.from_(self.bucket_name).upload(
                path=file_name,
                file=file_bytes,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )
            
            # Get the public URL
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(file_name)
            
            # Supabase Python SDK sometimes returns the URL in different formats based on version. 
            # In supabase-py 2.x, get_public_url returns a string directly.
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to upload PDF {file_name} to Supabase: {str(e)}")
            raise e
