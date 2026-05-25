# apps/common/storage.py
"""
Layer 4 + Layer 13: Intelligent File Storage & Storage Abstraction

Provides:
- AbstractStorageBackend (interface)
- DjangoStorageBackend (local filesystem via Django default_storage)
- S3StorageBackend (AWS S3 via django-storages)
- StorageFactory (backend selection from settings)
- ResumeStorageService (high-level resume file operations)

Strategy:
- canonical_json → stored permanently in the database
- Generated PDFs → cached, can be regenerated on demand
- Uploaded originals → permanent for audit trail
- Switch backends via settings.STORAGE_BACKEND without code changes
"""

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class AbstractStorageBackend:
    """
    Abstract base for storage operations.

    Supports:
    - Local filesystem
    - AWS S3
    - Google Cloud Storage
    - Azure Blob Storage
    """

    def save(self, path: str, content: bytes) -> str:
        """Save file. Returns actual storage path."""
        raise NotImplementedError

    def get(self, path: str) -> bytes:
        """Retrieve file content as bytes."""
        raise NotImplementedError

    def delete(self, path: str) -> None:
        """Delete file from storage."""
        raise NotImplementedError

    def exists(self, path: str) -> bool:
        """Check if file exists in storage."""
        raise NotImplementedError

    def url(self, path: str) -> str:
        """Get public URL for file."""
        raise NotImplementedError

    def size(self, path: str) -> int:
        """Get file size in bytes."""
        raise NotImplementedError


class DjangoStorageBackend(AbstractStorageBackend):
    """
    Django default storage backend.

    Uses whatever is configured in settings.STORAGES['default'].
    Works with local filesystem out of the box.
    """

    def __init__(self):
        self.storage = default_storage

    def save(self, path: str, content: bytes) -> str:
        saved_path = self.storage.save(path, ContentFile(content))
        logger.info(f"File saved to local storage: {saved_path}")
        return saved_path

    def get(self, path: str) -> bytes:
        with self.storage.open(path, 'rb') as f:
            return f.read()

    def delete(self, path: str) -> None:
        if self.storage.exists(path):
            self.storage.delete(path)
            logger.info(f"File deleted from local storage: {path}")

    def exists(self, path: str) -> bool:
        return self.storage.exists(path)

    def url(self, path: str) -> str:
        return self.storage.url(path)

    def size(self, path: str) -> int:
        return self.storage.size(path)


class S3StorageBackend(AbstractStorageBackend):
    """
    AWS S3 storage backend.

    Requires django-storages[boto3] and proper AWS credentials in settings.
    """

    def __init__(self):
        try:
            from storages.backends.s3boto3 import S3Boto3Storage
            self.storage = S3Boto3Storage()
        except ImportError:
            raise ImportError(
                "S3 backend requires 'django-storages[boto3]'. "
                "Install with: pip install django-storages[boto3]"
            )

    def save(self, path: str, content: bytes) -> str:
        saved_path = self.storage.save(path, ContentFile(content))
        logger.info(f"File saved to S3: {saved_path}")
        return saved_path

    def get(self, path: str) -> bytes:
        with self.storage.open(path, 'rb') as f:
            return f.read()

    def delete(self, path: str) -> None:
        if self.storage.exists(path):
            self.storage.delete(path)
            logger.info(f"File deleted from S3: {path}")

    def exists(self, path: str) -> bool:
        return self.storage.exists(path)

    def url(self, path: str) -> str:
        return self.storage.url(path)

    def size(self, path: str) -> int:
        return self.storage.size(path)


class StorageFactory:
    """
    Factory for storage backend selection.

    Configured via settings.STORAGE_BACKEND:
    - 'local' → DjangoStorageBackend (default)
    - 's3'    → S3StorageBackend

    Easy to extend with GCS, Azure, etc.
    """

    _backends = {
        'local': DjangoStorageBackend,
        's3': S3StorageBackend,
    }

    @classmethod
    def get_backend(cls) -> AbstractStorageBackend:
        """Get the configured storage backend instance."""
        backend_name = getattr(settings, 'STORAGE_BACKEND', 'local')
        backend_class = cls._backends.get(backend_name)

        if not backend_class:
            raise ValueError(
                f"Unknown storage backend: '{backend_name}'. "
                f"Available: {list(cls._backends.keys())}"
            )

        return backend_class()

    @classmethod
    def register_backend(cls, name: str, backend_class):
        """Register a custom storage backend at runtime."""
        cls._backends[name] = backend_class


class ResumeStorageService:
    """
    High-level service for storing and retrieving resume files.

    Abstracts away the underlying storage backend.
    """

    def __init__(self):
        self.storage = StorageFactory.get_backend()

    def save_pdf(self, resume_id: str, pdf_bytes: bytes) -> str:
        """Save a generated PDF. Returns the storage path."""
        path = f'resumes/generated/{resume_id}.pdf'
        return self.storage.save(path, pdf_bytes)

    def get_pdf(self, resume_id: str) -> bytes:
        """Retrieve a generated PDF as bytes."""
        path = f'resumes/generated/{resume_id}.pdf'
        return self.storage.get(path)

    def delete_pdf(self, resume_id: str) -> None:
        """Delete a cached PDF (can be regenerated from canonical_json)."""
        path = f'resumes/generated/{resume_id}.pdf'
        self.storage.delete(path)

    def pdf_exists(self, resume_id: str) -> bool:
        """Check if a generated PDF exists."""
        path = f'resumes/generated/{resume_id}.pdf'
        return self.storage.exists(path)

    def pdf_url(self, resume_id: str) -> str:
        """Get public URL for a generated PDF."""
        path = f'resumes/generated/{resume_id}.pdf'
        return self.storage.url(path)

    def save_upload(self, student_id: str, file_bytes: bytes, filename: str) -> str:
        """Save an uploaded resume file (permanent, for audit trail)."""
        path = f'resumes/uploads/{student_id}/{filename}'
        return self.storage.save(path, file_bytes)

    def get_upload(self, path: str) -> bytes:
        """Retrieve an uploaded resume file."""
        return self.storage.get(path)
