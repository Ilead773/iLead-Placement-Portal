# apps/templates_engine/views.py
"""API views for template management."""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from core.permissions import IsAdminOrCoordinator
from .models import ResumeTemplate
from .serializers import ResumeTemplateSerializer, ResumeTemplateListSerializer


class TemplateViewSet(viewsets.ViewSet):
    """Resume template management (admin/coordinator only for mutations)."""

    def list_templates(self, request):
        """GET — List all active templates."""
        templates = ResumeTemplate.objects.filter(is_active=True)
        return Response(ResumeTemplateListSerializer(templates, many=True).data)

    def get_template(self, request, pk=None):
        """GET — Get a specific template with full HTML/CSS."""
        template = get_object_or_404(ResumeTemplate, id=pk, is_active=True)
        return Response(ResumeTemplateSerializer(template).data)

    def create_template(self, request):
        """POST — Create a new template (admin only)."""
        self.check_permissions_admin(request)
        serializer = ResumeTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update_template(self, request, pk=None):
        """PUT — Creates a NEW VERSION (never edits in place)."""
        self.check_permissions_admin(request)
        existing = get_object_or_404(ResumeTemplate, id=pk)
        new_template = ResumeTemplate.create_new_version(
            existing,
            created_by=request.user,
            html_template=request.data.get('html_template', existing.html_template),
            css_styles=request.data.get('css_styles', existing.css_styles),
            description=request.data.get('description', existing.description),
        )
        return Response(ResumeTemplateSerializer(new_template).data)

    def delete_template(self, request, pk=None):
        """DELETE — Soft-deactivate template."""
        self.check_permissions_admin(request)
        template = get_object_or_404(ResumeTemplate, id=pk)
        template.is_active = False
        template.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    def check_permissions_admin(self, request):
        perm = IsAdminOrCoordinator()
        if not perm.has_permission(request, self):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin or coordinator access required.")
