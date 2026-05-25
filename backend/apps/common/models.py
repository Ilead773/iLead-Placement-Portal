# apps/common/models.py
"""
Layer 8: Soft Delete Infrastructure

Provides SoftDeleteModel abstract base class that adds:
- is_deleted / deleted_at / deleted_by fields
- Custom manager that hides soft-deleted records by default
- .with_deleted() / .only_deleted() / .active() querysets
- .soft_delete(user) / .restore() instance methods

All resume-domain models inherit from this to ensure compliance
and data recoverability.
"""

from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    """Custom queryset for soft-delete support."""

    def active(self):
        """Get only non-deleted items."""
        return self.filter(is_deleted=False)

    def deleted(self):
        """Get only deleted items."""
        return self.filter(is_deleted=True)

    def hard_delete(self):
        """Permanently delete (use sparingly, audit-sensitive)."""
        return super().delete()


class SoftDeleteManager(models.Manager):
    """
    Default manager that excludes soft-deleted records.

    Usage:
        Model.objects.all()           → active records only
        Model.objects.with_deleted()  → all records
        Model.objects.only_deleted()  → deleted records only
    """

    def get_queryset(self):
        """By default, exclude soft-deleted items."""
        return SoftDeleteQuerySet(self.model, using=self._db).filter(
            is_deleted=False
        )

    def with_deleted(self):
        """Include soft-deleted items in the queryset."""
        return SoftDeleteQuerySet(self.model, using=self._db).all()

    def only_deleted(self):
        """Return only soft-deleted items."""
        return SoftDeleteQuerySet(self.model, using=self._db).filter(
            is_deleted=True
        )


class AllObjectsManager(models.Manager):
    """
    Unfiltered manager — returns all records including soft-deleted.

    Useful for admin interfaces and data recovery operations.
    """

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).all()


class SoftDeleteModel(models.Model):
    """
    Abstract base model providing soft delete capability.

    Adds:
    - is_deleted (bool) — soft-delete flag, indexed for fast filtering
    - deleted_at (datetime) — when the record was soft-deleted
    - deleted_by (FK→User) — who performed the soft delete

    Managers:
    - objects  → only active (non-deleted) records
    - all_objects → all records including deleted

    Instance methods:
    - soft_delete(user=None) → mark as deleted
    - restore() → undo soft delete
    """

    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(app_label)s_%(class)s_deleted',
    )

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def soft_delete(self, user=None):
        """
        Soft delete this object.

        Args:
            user: The user performing the deletion (for audit trail).
        """
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

    def restore(self):
        """Restore a soft-deleted object."""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

    def delete(self, using=None, keep_parents=False, **kwargs):
        """
        Override default delete to perform soft delete.

        For actual deletion, use .hard_delete() on the queryset.
        """
        self.soft_delete()
