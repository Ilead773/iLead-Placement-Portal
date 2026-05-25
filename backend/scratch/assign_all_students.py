import os
import sys
import random
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import User, Student, Placement, PlacementAssignment

def assign_all_students():
    admin = User.objects.filter(role='admin').first()
    if not admin:
        print("No admin user found.")
        return

    students = list(Student.objects.all())
    placements = list(Placement.objects.all())

    if not students:
        print("No students found in the database.")
        return
    if not placements:
        print("No placements found in the database.")
        return

    print(f"Found {len(students)} students and {len(placements)} placements in the database.")
    print("Assigning students to placements...")

    statuses = ['assigned', 'applied', 'shortlisted', 'rejected', 'selected']
    total_created = 0

    for placement in placements:
        # Determine how many students to assign to this placement (e.g. 4 to 8 students, or up to total students)
        target_count = min(len(students), random.randint(4, 8))
        selected_students = random.sample(students, target_count)

        for student in selected_students:
            # Check if assignment already exists
            assignment, created = PlacementAssignment.objects.get_or_create(
                placement=placement,
                student=student,
                defaults={
                    'assigned_by': admin,
                    'status': random.choice(statuses)
                }
            )
            if created:
                total_created += 1
            else:
                # Optionally randomize the status of existing ones to make it dynamic
                assignment.status = random.choice(statuses)
                assignment.save()

        print(f"Placement '{placement.company_name}' now has {placement.assignments.count()} students assigned.")

    print(f"\nSuccessfully added/updated assignments! Created {total_created} new student assignments.")

if __name__ == '__main__':
    assign_all_students()
