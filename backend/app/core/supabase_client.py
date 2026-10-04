from supabase import create_client, Client
from backend.app.core.config import get_settings

settings = get_settings()

def get_supabase_client() -> Client:
    """
    Initialize and return the official Supabase Python client.
    Uses the service_role key to bypass RLS for secure bucket uploads.
    """
    url: str = settings.supabase_url
    key: str = settings.supabase_service_key
    
    # Initialize the client
    supabase: Client = create_client(url, key)
    return supabase
