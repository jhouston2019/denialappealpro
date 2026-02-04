"""
Supabase Storage integration for PDF files
"""
import os
import io
from supabase import create_client, Client
from config import Config

class SupabaseStorage:
    def __init__(self):
        self.enabled = Config.USE_SUPABASE_STORAGE
        if self.enabled:
            self.client: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
            self.bucket = Config.SUPABASE_STORAGE_BUCKET
            self._ensure_bucket_exists()
        else:
            print("Supabase Storage not configured, using local filesystem")
    
    def _ensure_bucket_exists(self):
        """Create the appeals bucket if it doesn't exist"""
        try:
            # Try to get bucket info
            self.client.storage.get_bucket(self.bucket)
            print(f"Supabase bucket '{self.bucket}' exists")
        except Exception:
            # Bucket doesn't exist, create it
            try:
                self.client.storage.create_bucket(
                    self.bucket,
                    options={
                        'public': False,  # Private bucket, requires authentication
                        'file_size_limit': 10485760,  # 10MB limit
                        'allowed_mime_types': ['application/pdf', 'image/jpeg', 'image/png']
                    }
                )
                print(f"Created Supabase bucket '{self.bucket}'")
            except Exception as e:
                print(f"Warning: Could not create bucket: {e}")
    
    def upload_file(self, file_path, file_data, content_type='application/pdf'):
        """
        Upload a file to Supabase Storage
        
        Args:
            file_path: Path within the bucket (e.g., 'appeals/appeal_123.pdf')
            file_data: File data as bytes or file-like object
            content_type: MIME type of the file
        
        Returns:
            Public URL of the uploaded file or None if upload fails
        """
        if not self.enabled:
            return None
        
        try:
            # If file_data is bytes, convert to BytesIO
            if isinstance(file_data, bytes):
                file_data = io.BytesIO(file_data)
            
            # Upload to Supabase Storage
            response = self.client.storage.from_(self.bucket).upload(
                file_path,
                file_data,
                file_options={
                    'content-type': content_type,
                    'upsert': 'true'  # Overwrite if exists
                }
            )
            
            print(f"Uploaded {file_path} to Supabase Storage")
            
            # Get the public URL (for signed access)
            # Note: For private buckets, you'll need to generate signed URLs
            return file_path
            
        except Exception as e:
            print(f"Error uploading to Supabase: {e}")
            return None
    
    def upload_pdf_from_path(self, local_path, remote_path):
        """
        Upload a PDF file from local filesystem to Supabase
        
        Args:
            local_path: Path to local PDF file
            remote_path: Path within Supabase bucket
        
        Returns:
            Remote path if successful, None otherwise
        """
        if not self.enabled:
            return None
        
        try:
            with open(local_path, 'rb') as f:
                return self.upload_file(remote_path, f, 'application/pdf')
        except Exception as e:
            print(f"Error uploading PDF: {e}")
            return None
    
    def download_file(self, file_path):
        """
        Download a file from Supabase Storage
        
        Args:
            file_path: Path within the bucket
        
        Returns:
            File data as bytes or None if download fails
        """
        if not self.enabled:
            return None
        
        try:
            response = self.client.storage.from_(self.bucket).download(file_path)
            return response
        except Exception as e:
            print(f"Error downloading from Supabase: {e}")
            return None
    
    def get_signed_url(self, file_path, expires_in=3600):
        """
        Get a signed URL for private file access
        
        Args:
            file_path: Path within the bucket
            expires_in: URL expiration time in seconds (default 1 hour)
        
        Returns:
            Signed URL string or None if fails
        """
        if not self.enabled:
            return None
        
        try:
            response = self.client.storage.from_(self.bucket).create_signed_url(
                file_path,
                expires_in
            )
            return response.get('signedURL')
        except Exception as e:
            print(f"Error creating signed URL: {e}")
            return None
    
    def delete_file(self, file_path):
        """
        Delete a file from Supabase Storage
        
        Args:
            file_path: Path within the bucket
        
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            self.client.storage.from_(self.bucket).remove([file_path])
            print(f"Deleted {file_path} from Supabase Storage")
            return True
        except Exception as e:
            print(f"Error deleting from Supabase: {e}")
            return False
    
    def list_files(self, folder_path=''):
        """
        List files in a folder
        
        Args:
            folder_path: Folder path within bucket (empty for root)
        
        Returns:
            List of file objects or empty list
        """
        if not self.enabled:
            return []
        
        try:
            response = self.client.storage.from_(self.bucket).list(folder_path)
            return response
        except Exception as e:
            print(f"Error listing files: {e}")
            return []

# Singleton instance
storage = SupabaseStorage()
