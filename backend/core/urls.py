# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/login/', views.AuthViewSet.as_view({'post': 'login'})),
    path('auth/logout/', views.AuthViewSet.as_view({'post': 'logout'})),
    path('auth/change-password/', views.AuthViewSet.as_view({'post': 'change_password'})),
    path('auth/refresh/', views.AuthViewSet.as_view({'post': 'refresh_token'})),
    path('auth/forgot-password/', views.AuthViewSet.as_view({'post': 'forgot_password'})),
    path('auth/reset-password-confirm/', views.AuthViewSet.as_view({'post': 'reset_password_confirm'})),

    # Students (Admin/Coordinator)
    path('students/import-csv/', views.StudentViewSet.as_view({'post': 'import_csv'})),
    path('students/', views.StudentViewSet.as_view({'get': 'list_students'})),
    path('students/<uuid:pk>/', views.StudentViewSet.as_view({'get': 'get_student', 'put': 'update_student', 'patch': 'update_student'})),
    path('students/<uuid:pk>/delete/', views.StudentViewSet.as_view({'delete': 'delete_student'})),
    path('students/<uuid:pk>/toggle-access/', views.StudentViewSet.as_view({'post': 'toggle_access'})),
    path('students/<uuid:pk>/change-category/', views.StudentViewSet.as_view({'post': 'change_category', 'put': 'change_category', 'patch': 'change_category'})),
    path('students/upload-history/', views.StudentViewSet.as_view({'get': 'upload_history'})),
    path('students/upload-status/<uuid:pk>/', views.StudentViewSet.as_view({'get': 'upload_status'})),
    path('students/upload-status/<uuid:pk>/download-credentials/', views.StudentViewSet.as_view({'get': 'download_credentials'})),

    # Placements (Admin/Coordinator)
    path('placements/', views.PlacementViewSet.as_view({'get': 'list_placements', 'post': 'create_placement'})),
    path('placements/<uuid:pk>/', views.PlacementViewSet.as_view({'get': 'get_placement', 'put': 'update_placement', 'delete': 'delete_placement'})),
    path('placements/<uuid:pk>/assign-students/', views.PlacementViewSet.as_view({'post': 'assign_students'})),
    path('placements/<uuid:pk>/assignments/', views.PlacementViewSet.as_view({'get': 'list_assignments'})),
    path('placements/<uuid:pk>/selected-excel/', views.PlacementViewSet.as_view({'get': 'selected_excel'})),

    # Assignments
    path('assignments/', views.AssignmentViewSet.as_view({'get': 'list_all'})),
    path('assignments/<uuid:pk>/status/', views.AssignmentViewSet.as_view({'patch': 'update_status'})),
    path('learning-assignments/courses/', views.LearningAssignmentAdminViewSet.as_view({'get': 'courses'})),
    path('learning-assignments/students/', views.LearningAssignmentAdminViewSet.as_view({'get': 'students'})),
    path('learning-assignments/bank/', views.LearningAssignmentAdminViewSet.as_view({'get': 'bank', 'post': 'bank'})),
    path('learning-assignments/bank/<uuid:pk>/', views.LearningAssignmentAdminViewSet.as_view({'put': 'bank_detail', 'patch': 'bank_detail', 'delete': 'bank_detail'})),
    path('learning-assignments/assign/', views.LearningAssignmentAdminViewSet.as_view({'post': 'assign'})),
    path('learning-assignments/results/', views.LearningAssignmentAdminViewSet.as_view({'get': 'results'})),

    # Student self-service
    path('me/', views.StudentSelfViewSet.as_view({'get': 'get_me'})),
    path('me/profile/', views.StudentSelfViewSet.as_view({'get': 'get_profile'})),
    path('me/placements/', views.StudentSelfViewSet.as_view({'get': 'my_placements'})),
    path('me/log-click/', views.StudentSelfViewSet.as_view({'post': 'log_click'})),
    path('me/learning-assignments/', views.StudentLearningAssignmentViewSet.as_view({'get': 'list_assignments'})),
    path('me/learning-assignments/<uuid:pk>/', views.StudentLearningAssignmentViewSet.as_view({'get': 'get_assignment_detail'})),
    path('me/learning-assignments/<uuid:pk>/submit/', views.StudentLearningAssignmentViewSet.as_view({'post': 'submit'})),

    # Dashboard
    path('dashboard/stats/', views.DashboardViewSet.as_view({'get': 'stats'})),
    path('dashboard/reports/', views.DashboardViewSet.as_view({'get': 'reports'})),

    # Admin Operations
    path('admin-ops/create-coordinator/', views.AdminOpsViewSet.as_view({'post': 'create_coordinator'})),
    path('admin-ops/coordinators/', views.AdminOpsViewSet.as_view({'get': 'list_coordinators'})),
    path('admin-ops/coordinators/<uuid:pk>/update-permissions/', views.AdminOpsViewSet.as_view({'put': 'update_permissions'})),
    path('admin-ops/external-clicks/', views.AdminOpsViewSet.as_view({'get': 'external_clicks'})),
    path('admin-ops/external-clicks/<uuid:pk>/mark-selected/', views.AdminOpsViewSet.as_view({'post': 'mark_selected'})),
    path('admin-ops/features/', views.FeatureConfigViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('admin-ops/features/bulk-update/', views.FeatureConfigViewSet.as_view({'post': 'bulk_update'})),
    path('admin-ops/features/<uuid:pk>/', views.FeatureConfigViewSet.as_view({'delete': 'destroy'})),

    # Audit
    path('audit-logs/', views.AuditLogViewSet.as_view({'get': 'list_logs'})),

    # Health Check
    path('health/', views.HealthCheckView.as_view(), name='health'),
]
