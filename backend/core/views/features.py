# core/views/features.py
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Student, StudentFeatureConfig
from ..serializers import StudentFeatureConfigSerializer
from ..permissions import IsAdminOnly


class FeatureConfigViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOnly]

    def list(self, request):
        configs = StudentFeatureConfig.objects.all().order_by('display_name')
        configs_serializer = StudentFeatureConfigSerializer(configs, many=True)

        # Get unique student streams from database
        streams = list(
            Student.objects.exclude(stream__isnull=True)
            .exclude(stream='')
            .values_list('stream', flat=True)
            .distinct()
        )

        # Prepopulate default departments/streams if not already in student profiles
        default_streams = ["Technology", "Business & Management", "Design & Media", "Health Sciences"]
        for ds in default_streams:
            if ds not in streams:
                streams.append(ds)

        return Response({
            'configs': configs_serializer.data,
            'departments': sorted(streams)
        })

    def create(self, request):
        feature_key = request.data.get('feature_key', '').strip().lower()
        display_name = request.data.get('display_name', '').strip()
        description = request.data.get('description', '').strip()

        if not feature_key or not display_name:
            return Response({'error': 'feature_key and display_name are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if StudentFeatureConfig.objects.filter(feature_key=feature_key).exists():
            return Response({'error': f'Feature with key "{feature_key}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        config = StudentFeatureConfig.objects.create(
            feature_key=feature_key,
            display_name=display_name,
            description=description,
            is_enabled=True,
            allowed_departments=[]
        )
        return Response(StudentFeatureConfigSerializer(config).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        configs_data = request.data
        if not isinstance(configs_data, list):
            return Response({'error': 'Expected a list of feature configurations.'}, status=status.HTTP_400_BAD_REQUEST)

        updated_configs = []
        for config_item in configs_data:
            feature_key = config_item.get('feature_key')
            is_enabled = config_item.get('is_enabled', True)
            allowed_departments = config_item.get('allowed_departments', [])

            try:
                config = StudentFeatureConfig.objects.get(feature_key=feature_key)
                config.is_enabled = is_enabled
                config.allowed_departments = allowed_departments
                config.save()
                updated_configs.append(config)
            except StudentFeatureConfig.DoesNotExist:
                continue

        return Response(StudentFeatureConfigSerializer(updated_configs, many=True).data)

    def destroy(self, request, pk=None):
        try:
            config = StudentFeatureConfig.objects.get(pk=pk)
            core_features = ['mock-interview', 'resumes', 'jobs', 'internships', 'job-feed', 'saved-jobs', 'assignments', 'sessions', 'north-star']
            if config.feature_key in core_features:
                return Response({'error': 'Cannot delete core system features.'}, status=status.HTTP_400_BAD_REQUEST)
            config.delete()
            return Response({'message': 'Feature deleted successfully.'}, status=status.HTTP_200_OK)
        except StudentFeatureConfig.DoesNotExist:
            return Response({'error': 'Feature configuration not found.'}, status=status.HTTP_404_NOT_FOUND)
