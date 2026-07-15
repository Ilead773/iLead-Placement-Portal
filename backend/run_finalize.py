import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.tasks import finalize_attendance

class_id = "6732c3c4-4e90-40fc-8d21-21836e33f60e"
print(f"=== RUNNING ATTENDANCE FINALIZATION FOR CLASS ID: {class_id} ===")
finalize_attendance(class_id)
print("=== FINALIZATION COMPLETE ===")
