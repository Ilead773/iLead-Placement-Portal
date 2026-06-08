# core/views/dashboard.py
"""Dashboard stats, reports, and audit logs (Admin/Coordinator)."""
import csv
import io
import json
from datetime import datetime, timedelta
from collections import defaultdict

from django.db.models import Count, Avg, Max, Min, Q, Sum
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Student, AuditLog, Placement, PlacementAssignment
from apps.jobs.models import Job, JobRound
from apps.applications.models import Application, ApplicationRound
from apps.scraped_jobs.course_config import get_all_course_names, normalize_course_name
from django.utils import timezone
from ..serializers import AuditLogSerializer
from ..permissions import IsAdminOrCoordinator


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrCoordinator]

    def _to_lpa(self, val):
        """Convert salary to LPA (Lakhs Per Annum)."""
        if not val:
            return 0.0
        val_f = float(val)
        if val_f >= 1000.0:
            return round(val_f / 100000.0, 2)
        return round(val_f, 2)

    def _to_stipend(self, val):
        """Return stipend as raw monthly amount (no LPA conversion)."""
        if not val:
            return 0.0
        val_f = float(val)
        # If stored as LPA (usually small decimal, e.g. < 100), convert to raw monthly
        if val_f < 100:
            return round(val_f * 100000 / 12, 0)
        # If stored as annual (>= 100000), convert to monthly
        if val_f >= 100000:
            return round(val_f / 12, 0)
        # Otherwise it's already a raw monthly amount (e.g. 15000)
        return round(val_f, 0)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Comprehensive placement dashboard statistics with all KPIs."""

        listing_type = request.query_params.get('listing_type')
        is_internship_view = (listing_type == 'internship')

        # Setup querysets (exclude soft-deleted applications)
        jobs_qs = Job.objects.all()
        applications_qs = Application.objects.filter(is_deleted=False)

        if listing_type in ('job', 'internship'):
            jobs_qs = jobs_qs.filter(listing_type=listing_type)
            applications_qs = applications_qs.filter(job__listing_type=listing_type)

        # ============== OVERVIEW & KPIs ==============
        total_students = Student.objects.count()
        total_job_applications = applications_qs.count()
        total_jobs = jobs_qs.count()
        total_companies = 0  # Will be populated accurately after company_details is built below

        # Placements and Placed Student IDs (Union of PlacementAssignment and Application)
        placed_students_assignments = set()
        if not is_internship_view:
            placed_students_assignments = set(
                PlacementAssignment.objects.filter(status='selected').values_list('student_id', flat=True)
            )
        placed_students_applications = set(
            applications_qs.filter(status__in=['selected', 'accepted']).values_list('student_id', flat=True)
        )
        placed_student_ids = placed_students_assignments | placed_students_applications
        placed_count = len(placed_student_ids)
        placement_rate = round((placed_count / total_students * 100), 1) if total_students else 0.0

        # Total placements count (non-unique offers)
        total_placements = len(placed_students_applications)
        if not is_internship_view:
            total_placements += PlacementAssignment.objects.filter(status='selected').count()

        total_assignments = PlacementAssignment.objects.count()

        # Total Openings Count (sum of openings across all jobs)
        total_openings = jobs_qs.aggregate(total=Sum('openings_count'))['total'] or 0

        # On-Campus vs Off-Campus Placed Learners
        placed_on_campus_assignments = set()
        if not is_internship_view:
            placed_on_campus_assignments = set(
                PlacementAssignment.objects.filter(status='selected').values_list('student_id', flat=True)
            )
        placed_on_campus_applications = set(
            applications_qs.filter(status__in=['selected', 'accepted'], job__job_type='internal').values_list('student_id', flat=True)
        )
        placed_on_campus_ids = placed_on_campus_assignments | placed_on_campus_applications
        placed_on_campus_count = len(placed_on_campus_ids)

        placed_off_campus_ids = set(
            applications_qs.filter(status__in=['selected', 'accepted'], job__job_type='external').values_list('student_id', flat=True)
        ) - placed_on_campus_ids
        placed_off_campus_count = len(placed_off_campus_ids)

        # Job statuses (Active, COMPLETE/Closed, On Hold/Draft)
        jobs_active = jobs_qs.filter(status='active').count()
        jobs_complete = jobs_qs.filter(status='closed').count()
        jobs_on_hold = jobs_qs.filter(status='draft').count()

        # Participation & funnel metrics
        if is_internship_view:
            applied_student_ids = set(applications_qs.values_list('student_id', flat=True))
        else:
            applied_student_ids = set(applications_qs.values_list('student_id', flat=True)) | set(PlacementAssignment.objects.values_list('student_id', flat=True))
        
        unique_learners_applying = len(applied_student_ids)
        learners_not_applying = total_students - unique_learners_applying
        
        total_offers_received = total_placements
        offer_letters_uploaded = applications_qs.filter(status__in=['selected', 'accepted'], offer_letter_uploaded=True).count()
        offer_letters_not_uploaded = max(0, total_offers_received - offer_letters_uploaded)

        # ============== STATUS METRICS ==============
        # Map application statuses to the dashboard metric names
        app_status_counts = dict(
            applications_qs.values('status').annotate(c=Count('id')).values_list('status', 'c')
        )

        # Applied Count = applied in both systems
        applied_count = app_status_counts.get('applied', 0)
        # In Interview = shortlisted + interviewing (currently in interview pipeline)
        in_interview = app_status_counts.get('shortlisted', 0) + app_status_counts.get('interviewing', 0)
        # Offer Received = selected (not yet accepted)
        offer_received = app_status_counts.get('selected', 0)
        # Offer Accepted = explicitly accepted
        offer_accepted = app_status_counts.get('accepted', 0)
        # Rejected
        rejected_count = app_status_counts.get('rejected', 0)
        # Withdrawn / Pending
        withdrawn_count = app_status_counts.get('withdrawn', 0)
        # Not Applied = students with zero applications/assignments
        not_applied_count = Student.objects.exclude(id__in=applied_student_ids).count()

        status_metrics = {
            'applied_count': applied_count,
            'in_interview': in_interview,
            'offer_received': offer_received,
            'offer_accepted': offer_accepted,
            'rejected_count': rejected_count,
            'pending_decision': withdrawn_count,
            'not_applied': not_applied_count,
        }

        # ============== SALARY / STIPEND ANALYSIS ==============
        is_internship_view = (listing_type == 'internship')

        # Scope raw data to the listing type filter
        if is_internship_view:
            job_data = list(jobs_qs.filter(listing_type='internship').values(
                'company_name', 'package', 'role', 'location', 'job_type', 'listing_type'
            ))
        else:
            job_data = list(
                jobs_qs.filter(listing_type='job').values(
                    'company_name', 'package', 'role', 'location', 'job_type', 'listing_type'
                )
            )

        all_salaries = []
        company_details = {}
        location_details = defaultdict(lambda: {'jobs': 0, 'salaries': []})
        job_type_dist = defaultdict(int)
        # Global Opportunities Split (unfiltered by listing_type)
        listing_type_dist = defaultdict(int)
        for lt, count in Job.objects.values_list('listing_type').annotate(c=Count('id')):
            listing_type_dist[lt or 'job'] = count
        listing_type_dist['job'] += Placement.objects.count()
        role_counts = defaultdict(int)

        def _convert(val):
            """Convert package value: stipend (raw ₹/mo) for internships, LPA for jobs."""
            if is_internship_view:
                return self._to_stipend(val)
            return self._to_lpa(val)

        # Process jobs / internships
        for j in job_data:
            cname = j['company_name']
            package_val = j['package']
            
            if cname not in company_details:
                company_details[cname] = {
                    'roles': set(), 'max_package': 0.0, 'min_package': float('inf'),
                    'placed_count': 0, 'salaries': [], 'locations': set()
                }
            company_details[cname]['roles'].add(j['role'])
            
            # Fallback to Placement salary if package is 0
            if not package_val or float(package_val) <= 0:
                placement = Placement.objects.filter(company_name__iexact=cname).first()
                if placement:
                    package_val = placement.salary
            
            if package_val and float(package_val) > 0:
                if not j['package'] or float(j['package']) <= 0:
                    val = float(package_val)
                    if not is_internship_view:
                        val = self._to_lpa(val)
                    else:
                        val = self._to_stipend(val)
                else:
                    val = _convert(package_val)
                    
                company_details[cname]['salaries'].append(val)
                if val > company_details[cname]['max_package']:
                    company_details[cname]['max_package'] = val
                if val < company_details[cname]['min_package']:
                    company_details[cname]['min_package'] = val
                    
            company_details[cname]['locations'].add(j.get('location', 'Unknown'))
            role_counts[j['role']] += 1
            location_details[j.get('location', 'Unknown')]['jobs'] += 1
            
            if package_val and float(package_val) > 0:
                if not j['package'] or float(j['package']) <= 0:
                    val = float(package_val)
                    if not is_internship_view:
                        val = self._to_lpa(val)
                    else:
                        val = self._to_stipend(val)
                else:
                    val = _convert(package_val)
                location_details[j.get('location', 'Unknown')]['salaries'].append(val)
                
            job_type_dist[j.get('job_type', 'unknown')] += 1

        # Process internal placements if not in internship view
        if not is_internship_view:
            for p in Placement.objects.all():
                cname = p.company_name
                package_val = p.salary
                role_name = p.position
                
                if cname not in company_details:
                    company_details[cname] = {
                        'roles': set(), 'max_package': 0.0, 'min_package': float('inf'),
                        'placed_count': 0, 'salaries': [], 'locations': set()
                    }
                company_details[cname]['roles'].add(role_name)
                
                if package_val and float(package_val) > 0:
                    val = self._to_lpa(package_val)
                    company_details[cname]['salaries'].append(val)
                    if val > company_details[cname]['max_package']:
                        company_details[cname]['max_package'] = val
                    if val < company_details[cname]['min_package']:
                        company_details[cname]['min_package'] = val
                        
                company_details[cname]['locations'].add('On-Campus')
                role_counts[role_name] += 1
                location_details['On-Campus']['jobs'] += 1
                
                if package_val and float(package_val) > 0:
                    val = self._to_lpa(package_val)
                    location_details['On-Campus']['salaries'].append(val)
                    
                job_type_dist['internal'] += 1

        # Collect salaries of actual placed students, grouped by student to pick their highest offer
        student_salaries = defaultdict(list)
        
        # 1. Collect from Applications (with Placement table fallback for 0 package jobs)
        app_filter_all = Q(status__in=['selected', 'accepted'])
        if is_internship_view:
            app_filter_all &= Q(job__listing_type='internship')
        else:
            app_filter_all &= Q(job__listing_type='job')
            
        for app in applications_qs.filter(app_filter_all).select_related('job'):
            pkg = float(app.job.package or 0)
            if pkg <= 0:
                # Fallback to Placement table with case-insensitive company name match
                placement = Placement.objects.filter(company_name__iexact=app.job.company_name).first()
                if placement:
                    pkg = float(placement.salary or 0)
                    if not is_internship_view:
                        pkg = self._to_lpa(pkg)
                    else:
                        pkg = self._to_stipend(pkg)
            else:
                pkg = _convert(app.job.package)
                
            if pkg > 0:
                student_salaries[app.student_id].append(pkg)

        # 2. Collect from PlacementAssignments
        if not is_internship_view:
            for pa in PlacementAssignment.objects.filter(status='selected', placement__salary__gt=0).select_related('placement'):
                pkg = self._to_lpa(pa.placement.salary)
                if pkg > 0:
                    student_salaries[pa.student_id].append(pkg)
                    
        # Group by student: select only the HIGHEST package for each placed student
        for student_id, salaries in student_salaries.items():
            if salaries:
                all_salaries.append(max(salaries))

        # Count application placements
        for sel in applications_qs.filter(status__in=['selected', 'accepted']).select_related('job'):
            cname = sel.job.company_name
            if cname in company_details:
                company_details[cname]['placed_count'] += 1

        # Count PlacementAssignment placements
        if not is_internship_view:
            for pa in PlacementAssignment.objects.filter(status='selected').select_related('placement'):
                cname = pa.placement.company_name
                if cname in company_details:
                    company_details[cname]['placed_count'] += 1

        # Reconcile total companies count to guarantee 100% consistency
        total_companies = len(company_details)

        # Aggregate stats
        sorted_salaries = sorted(all_salaries)
        max_salary = max(all_salaries) if all_salaries else 0.0
        min_salary = min(all_salaries) if all_salaries else 0.0
        avg_salary = round(sum(all_salaries) / len(all_salaries), 2) if all_salaries else 0.0
        median_salary = sorted_salaries[len(sorted_salaries) // 2] if sorted_salaries else 0.0

        # Employer compensation stats (scoped)
        emp_packages = [
            _convert(p) for p in jobs_qs.filter(package__gt=0).values_list('package', flat=True)
        ]
        avg_ctc_employer = round(sum(emp_packages) / len(emp_packages), 2) if emp_packages else 0.0
        sorted_emp = sorted(emp_packages)
        median_ctc_employer = sorted_emp[len(sorted_emp) // 2] if sorted_emp else 0.0
        min_ctc_employer = min(emp_packages) if emp_packages else 0.0
        max_ctc_employer = max(emp_packages) if emp_packages else 0.0

        # Most common value
        if all_salaries:
            from statistics import mode
            try:
                most_common_salary = mode(round(s, 0) for s in all_salaries)
            except Exception:
                most_common_salary = round(avg_salary, 1)
        else:
            most_common_salary = 0.0

        # Distribution brackets — adapt labels for internships vs jobs
        if is_internship_view:
            sal_dist = {
                '< ₹10k/mo': 0, '₹10k–20k/mo': 0,
                '₹20k–40k/mo': 0, '₹40k+/mo': 0,
            }
            salary_bands_detailed = {
                '₹5k–10k': 0, '₹10k–20k': 0,
                '₹20k–30k': 0, '₹30k–50k': 0, '₹50k+': 0,
            }
            for s in all_salaries:
                if s < 10000:
                    sal_dist['< ₹10k/mo'] += 1
                elif s < 20000:
                    sal_dist['₹10k–20k/mo'] += 1
                elif s < 40000:
                    sal_dist['₹20k–40k/mo'] += 1
                else:
                    sal_dist['₹40k+/mo'] += 1
                if 5000 <= s < 10000:
                    salary_bands_detailed['₹5k–10k'] += 1
                elif 10000 <= s < 20000:
                    salary_bands_detailed['₹10k–20k'] += 1
                elif 20000 <= s < 30000:
                    salary_bands_detailed['₹20k–30k'] += 1
                elif 30000 <= s < 50000:
                    salary_bands_detailed['₹30k–50k'] += 1
                elif s >= 50000:
                    salary_bands_detailed['₹50k+'] += 1
        else:
            sal_dist = {'< 3 LPA': 0, '3 - 6 LPA': 0, '6 - 10 LPA': 0, '10+ LPA': 0}
            salary_bands_detailed = {
                '4–6 LPA': 0, '6–8 LPA': 0, '8–10 LPA': 0,
                '10–12 LPA': 0, '12+ LPA': 0
            }
            for s in all_salaries:
                if s < 3.0:
                    sal_dist['< 3 LPA'] += 1
                elif s <= 6.0:
                    sal_dist['3 - 6 LPA'] += 1
                elif s <= 10.0:
                    sal_dist['6 - 10 LPA'] += 1
                else:
                    sal_dist['10+ LPA'] += 1
                if 4.0 <= s < 6.0:
                    salary_bands_detailed['4–6 LPA'] += 1
                elif 6.0 <= s < 8.0:
                    salary_bands_detailed['6–8 LPA'] += 1
                elif 8.0 <= s < 10.0:
                    salary_bands_detailed['8–10 LPA'] += 1
                elif 10.0 <= s < 12.0:
                    salary_bands_detailed['10–12 LPA'] += 1
                elif s >= 12.0:
                    salary_bands_detailed['12+ LPA'] += 1

        # Highest compensated role
        highest_paid_role = ''
        highest_role_salary = 0.0
        
        # External applications
        for app in applications_qs.filter(app_filter_all).select_related('job'):
            val = float(app.job.package or 0)
            if val <= 0:
                placement = Placement.objects.filter(company_name__iexact=app.job.company_name).first()
                if placement:
                    val = float(placement.salary or 0)
                    if not is_internship_view:
                        val = self._to_lpa(val)
                    else:
                        val = self._to_stipend(val)
            else:
                val = _convert(app.job.package)
                
            if val > highest_role_salary:
                highest_role_salary = val
                highest_paid_role = app.job.role

        # Internal placement assignments
        if not is_internship_view:
            for pa in PlacementAssignment.objects.filter(status='selected', placement__salary__gt=0).select_related('placement'):
                val = self._to_lpa(pa.placement.salary)
                if val > highest_role_salary:
                    highest_role_salary = val
                    highest_paid_role = pa.placement.position

        # ============== APPLICATION STATUS ==============
        placement_status_dist = {}
        app_status_dist = dict(
            Application.objects.filter(is_deleted=False).values('status').annotate(count=Count('id')).values_list('status', 'count')
        )

        # ============== COURSE/STREAM PERFORMANCE ==============
        from apps.scraped_jobs.course_config import get_all_course_names, normalize_course_name
        all_courses = get_all_course_names()
        
        # Group student IDs by normalized course
        students_by_normalized_course = defaultdict(list)
        placed_students_by_normalized_course = defaultdict(list)
        
        for student in Student.objects.all():
            norm_c = normalize_course_name(student.course) or 'Unspecified Course'
            students_by_normalized_course[norm_c].append(student.id)
            if student.id in placed_student_ids:
                placed_students_by_normalized_course[norm_c].append(student.id)
                
        course_wise_stats = []

        # Setup standard app filter for course salary queries
        app_filter_course_base = Q(status__in=['selected', 'accepted'], job__package__gt=0)
        if is_internship_view:
            app_filter_course_base &= Q(job__listing_type='internship')
        else:
            app_filter_course_base &= Q(job__listing_type='job')

        # Populate all standard courses first
        for course in all_courses:
            total = len(students_by_normalized_course[course])
            placed_in_course = len(placed_students_by_normalized_course[course])
            rate = round((placed_in_course / total * 100), 1) if total else 0.0

            course_salaries = []
            for app in applications_qs.filter(app_filter_course_base).select_related('student', 'job'):
                if normalize_course_name(app.student.course) == course:
                    course_salaries.append(_convert(app.job.package))

            # Include PlacementAssignment salaries
            if not is_internship_view:
                for pa in PlacementAssignment.objects.filter(status='selected', placement__salary__gt=0).select_related('student', 'placement'):
                    if normalize_course_name(pa.student.course) == course:
                        course_salaries.append(self._to_lpa(pa.placement.salary))

            avg_sal = round(sum(course_salaries) / len(course_salaries), 2) if course_salaries else 0.0
            max_sal = max(course_salaries) if course_salaries else 0.0

            course_wise_stats.append({
                'course': course,
                'total': total,
                'placed': placed_in_course,
                'placement_rate': rate,
                'avg_salary': avg_sal,
                'max_salary': max_sal,
            })

        # Capture any non-standard courses present in database
        for db_course in students_by_normalized_course.keys():
            if db_course not in all_courses:
                total = len(students_by_normalized_course[db_course])
                placed_in_course = len(placed_students_by_normalized_course[db_course])
                rate = round((placed_in_course / total * 100), 1) if total else 0.0

                course_salaries = []
                for app in applications_qs.filter(app_filter_course_base).select_related('student', 'job'):
                    if normalize_course_name(app.student.course) == db_course:
                        course_salaries.append(_convert(app.job.package))

                # Include PlacementAssignment salaries
                if not is_internship_view:
                    for pa in PlacementAssignment.objects.filter(status='selected', placement__salary__gt=0).select_related('student', 'placement'):
                        if normalize_course_name(pa.student.course) == db_course:
                            course_salaries.append(self._to_lpa(pa.placement.salary))

                avg_sal = round(sum(course_salaries) / len(course_salaries), 2) if course_salaries else 0.0
                max_sal = max(course_salaries) if course_salaries else 0.0

                course_wise_stats.append({
                    'course': db_course,
                    'total': total,
                    'placed': placed_in_course,
                    'placement_rate': rate,
                    'avg_salary': avg_sal,
                    'max_salary': max_sal,
                })

        # Best performing course
        best_course = max(course_wise_stats, key=lambda x: x['placement_rate']) if course_wise_stats else {}
        course_rankings = sorted(course_wise_stats, key=lambda x: -x['placement_rate'])

        # ============== SEMESTER-WISE STATS ==============
        students_by_sem = Student.objects.values('semester').annotate(total=Count('id'))
        semester_wise_stats = []
        for item in students_by_sem:
            sem = item['semester'] or 'Unknown'
            total = item['total']
            placed_in_sem = Student.objects.filter(id__in=placed_student_ids, semester=sem).count()
            rate = round((placed_in_sem / total * 100), 1) if total else 0.0
            semester_wise_stats.append({
                'semester': sem,
                'total': total,
                'placed': placed_in_sem,
                'placement_rate': rate
            })

        # ============== YEAR-WISE (BATCH) STATS ==============
        students_by_year = Student.objects.values('passing_year').annotate(total=Count('id'))
        year_wise_stats = []
        for item in students_by_year:
            year = item['passing_year'] or 'Unknown'
            total = item['total']
            placed_in_year = Student.objects.filter(id__in=placed_student_ids, passing_year=year).count()
            rate = round((placed_in_year / total * 100), 1) if total else 0.0
            year_wise_stats.append({
                'year': year,
                'total': total,
                'placed': placed_in_year,
                'placement_rate': rate
            })

        # ============== STUDENT DEMOGRAPHICS ==============
        all_students_cgpa = Student.objects.exclude(cgpa__isnull=True)
        cgpa_stats = {
            'avg_cgpa': round(all_students_cgpa.aggregate(Avg('cgpa'))['cgpa__avg'] or 0, 2),
            'max_cgpa': all_students_cgpa.aggregate(Max('cgpa'))['cgpa__max'] or 0,
            'min_cgpa': all_students_cgpa.aggregate(Min('cgpa'))['cgpa__min'] or 0,
        }

        cgpa_dist = {
            '< 6.0': Student.objects.filter(cgpa__lt=6.0).count(),
            '6.0 – 7.0': Student.objects.filter(cgpa__gte=6.0, cgpa__lt=7.0).count(),
            '7.0 – 8.0': Student.objects.filter(cgpa__gte=7.0, cgpa__lt=8.0).count(),
            '8.0 – 9.0': Student.objects.filter(cgpa__gte=8.0, cgpa__lt=9.0).count(),
            '9.0+': Student.objects.filter(cgpa__gte=9.0).count(),
        }

        # CGPA-based placement rates (10-point scale)
        def cgpa_placement_rate(qs_filter, placed_ids):
            group = Student.objects.filter(**qs_filter)
            total = group.count()
            placed = group.filter(id__in=placed_ids).count()
            return {
                'total': total,
                'placed': placed,
                'rate': round((placed / total * 100), 1) if total else 0.0
            }

        cgpa_placement_rates = {
            'cgpa_8_plus': cgpa_placement_rate({'cgpa__gte': 8.0}, placed_student_ids),
            'cgpa_6_to_8': cgpa_placement_rate({'cgpa__gte': 6.0, 'cgpa__lt': 8.0}, placed_student_ids),
            'cgpa_below_6': cgpa_placement_rate({'cgpa__lt': 6.0}, placed_student_ids),
        }

        attendance_stats = {
            'avg_attendance': round(Student.objects.exclude(attendance__isnull=True).aggregate(Avg('attendance'))['attendance__avg'] or 0, 2),
        }

        students_with_backlogs = Student.objects.filter(backlogs=True).count()
        students_without_backlogs = Student.objects.filter(backlogs=False).count()

        category_dist = dict(
            Student.objects.values('category').annotate(count=Count('id')).values_list('category', 'count')
        )

        # ============== INTERVIEW ROUNDS ==============
        all_rounds = ApplicationRound.objects.filter(application__is_deleted=False).select_related('application', 'job_round')
        round_performance = defaultdict(lambda: {
            'total': 0, 'cleared': 0, 'failed': 0, 'scores': []
        })

        for ar in all_rounds:
            rn = ar.round_number
            round_performance[rn]['total'] += 1
            if ar.status == 'cleared':
                round_performance[rn]['cleared'] += 1
            elif ar.status == 'failed':
                round_performance[rn]['failed'] += 1
            if ar.score:
                round_performance[rn]['scores'].append(ar.score)

        round_stats = []
        for rn in sorted(round_performance.keys()):
            perf = round_performance[rn]
            clearance_rate = round((perf['cleared'] / perf['total'] * 100), 1) if perf['total'] else 0.0
            avg_score = round(sum(perf['scores']) / len(perf['scores']), 2) if perf['scores'] else 0.0
            drop_off_rate = round((perf['failed'] / perf['total'] * 100), 1) if perf['total'] else 0.0
            round_stats.append({
                'round_number': rn,
                'total_applications': perf['total'],
                'cleared': perf['cleared'],
                'failed': perf['failed'],
                'clearance_rate': clearance_rate,
                'avg_score': avg_score,
                'drop_off_rate': drop_off_rate,
            })

        round_types = dict(
            JobRound.objects.values('round_type').annotate(count=Count('id')).values_list('round_type', 'count')
        )

        # ============== TIMELINE & TRENDS ==============
        all_placement_dates = []
        selection_months = {}

        for dt in Application.objects.filter(status__in=['selected', 'accepted'], is_deleted=False).values_list('updated_at', flat=True):
            if dt:
                all_placement_dates.append(dt)
                m_str = dt.strftime('%b %Y')
                selection_months[m_str] = selection_months.get(m_str, 0) + 1

        first_placement_date = min(all_placement_dates).strftime('%d %b %Y') if all_placement_dates else None
        last_placement_date = max(all_placement_dates).strftime('%d %b %Y') if all_placement_dates else None
        peak_month = max(selection_months, key=selection_months.get) if selection_months else None

        # Avg days to placement (from application to selection)
        placement_durations = []
        for app in Application.objects.filter(status__in=['selected', 'accepted'], is_deleted=False).exclude(applied_at__isnull=True):
            delta = (app.updated_at - app.applied_at).days
            if delta >= 0:
                placement_durations.append(delta)
        avg_days_to_placement = round(sum(placement_durations) / len(placement_durations), 1) if placement_durations else None

        try:
            sorted_months = sorted(selection_months.keys(), key=lambda x: datetime.strptime(x, '%b %Y'))
            monthly_trend = [{'month': m, 'placed_count': selection_months[m]} for m in sorted_months]
        except Exception:
            monthly_trend = [{'month': m, 'placed_count': selection_months[m]} for m in sorted(selection_months.keys())]

        app_dates = Application.objects.filter(is_deleted=False).exclude(applied_at__isnull=True).values_list('applied_at', flat=True)
        app_timeline_map = defaultdict(int)
        for dt in app_dates:
            app_timeline_map[dt.strftime('%b %Y')] += 1

        try:
            sorted_app_months = sorted(app_timeline_map.keys(), key=lambda x: datetime.strptime(x, '%b %Y'))
            application_timeline = [{'month': m, 'applications': app_timeline_map[m]} for m in sorted_app_months]
        except Exception:
            application_timeline = [{'month': m, 'applications': app_timeline_map[m]} for m in sorted(app_timeline_map.keys())]

        timeline_extras = {
            'first_placement_date': first_placement_date,
            'last_placement_date': last_placement_date,
            'peak_placement_month': peak_month,
            'avg_days_to_placement': avg_days_to_placement,
        }

        # ============== ELIGIBILITY & DEPARTMENTAL ANALYSIS ==============
        eligible_students = 0
        eligible_student_ids = set()
        ineligible_reasons = defaultdict(int)
        cgpa_not_met = 0
        attendance_not_met = 0
        backlog_disqualified = 0
        
        # Course-wise eligibility, categories, and PACT stats
        course_elig_stats = defaultdict(lambda: {
            'course': '',
            'total_students': 0,
            'eligible_count': 0,
            'ineligible_count': 0,
            'cat_a': 0,
            'cat_b': 0,
            'cat_c': 0,
            'pact_scores': [],
            'cgpas': [],
            'attendances': [],
        })

        category_counts = {'A': 0, 'B': 0, 'C': 0}
        all_pact_scores = []

        for student in Student.objects.all():
            course_name = student.course or 'Unknown'
            course_key = course_name.strip()
            
            stats_entry = course_elig_stats[course_key]
            stats_entry['course'] = course_key
            stats_entry['total_students'] += 1
            
            # PACT score
            p_score = student.pact_score
            stats_entry['pact_scores'].append(p_score)
            all_pact_scores.append(p_score)
            
            # Category
            cat = student.category or student.calculate_category() or 'C'
            category_counts[cat] = category_counts.get(cat, 0) + 1
            if cat == 'A':
                stats_entry['cat_a'] += 1
            elif cat == 'B':
                stats_entry['cat_b'] += 1
            elif cat == 'C':
                stats_entry['cat_c'] += 1
            
            # CGPA & Attendance list for averages
            if student.cgpa is not None:
                stats_entry['cgpas'].append(student.cgpa)
            if student.attendance is not None:
                stats_entry['attendances'].append(student.attendance)

            # Eligibility checks
            eligible = True
            if student.cgpa is not None and student.cgpa < 6.0:
                ineligible_reasons['CGPA Below 6.0'] += 1
                cgpa_not_met += 1
                eligible = False
            elif student.cgpa is None:
                ineligible_reasons['CGPA Below 6.0'] += 1
                cgpa_not_met += 1
                eligible = False

            if student.attendance is not None and student.attendance < 75:
                ineligible_reasons['Attendance Below 75%'] += 1
                attendance_not_met += 1
                eligible = False
            elif student.attendance is None:
                ineligible_reasons['Attendance Below 75%'] += 1
                attendance_not_met += 1
                eligible = False

            if student.backlogs:
                ineligible_reasons['Has Backlogs'] += 1
                backlog_disqualified += 1
                eligible = False

            if eligible:
                eligible_student_ids.add(student.id)
                eligible_students += 1
                stats_entry['eligible_count'] += 1
            else:
                stats_entry['ineligible_count'] += 1

        ineligible_students = total_students - eligible_students
        eligibility_compliance = round((eligible_students / total_students * 100), 1) if total_students else 0.0

        course_eligibility_list = []
        for key, entry in course_elig_stats.items():
            pacts = entry['pact_scores']
            avg_p = round(sum(pacts) / len(pacts), 1) if pacts else 0.0
            cgps = entry['cgpas']
            avg_c = round(sum(cgps) / len(cgps), 2) if cgps else 0.0
            atts = entry['attendances']
            avg_a = round(sum(atts) / len(atts), 1) if atts else 0.0
            
            course_eligibility_list.append({
                'course': entry['course'],
                'total_students': entry['total_students'],
                'eligible_count': entry['eligible_count'],
                'ineligible_count': entry['ineligible_count'],
                'eligibility_rate': round((entry['eligible_count'] / entry['total_students'] * 100), 1) if entry['total_students'] else 0.0,
                'cat_a': entry['cat_a'],
                'cat_b': entry['cat_b'],
                'cat_c': entry['cat_c'],
                'avg_pact_score': avg_p,
                'avg_cgpa': avg_c,
                'avg_attendance': avg_a,
            })

        avg_global_pact = round(sum(all_pact_scores) / len(all_pact_scores), 1) if all_pact_scores else 0.0
        max_global_pact = max(all_pact_scores) if all_pact_scores else 0.0
        min_global_pact = min(all_pact_scores) if all_pact_scores else 0.0

        eligibility_detail = {
            'eligible_students': eligible_students,
            'ineligible_students': ineligible_students,
            'cgpa_not_met': cgpa_not_met,
            'attendance_not_met': attendance_not_met,
            'backlog_disqualified': backlog_disqualified,
            'course_not_eligible': 0,
            'eligibility_compliance_pct': eligibility_compliance,
            'ineligible_reasons': dict(ineligible_reasons),
            'category_distribution': category_counts,
            'avg_pact_score': avg_global_pact,
            'max_pact_score': max_global_pact,
            'min_pact_score': min_global_pact,
            'course_eligibility': course_eligibility_list,
        }

        # ============== COMPANY ANALYSIS ==============
        companies_list = []
        company_rankings = []

        for cname, details in company_details.items():
            min_pkg = details['min_package'] if details['min_package'] != float('inf') else 0.0
            sals = [s for s in details['salaries'] if s > 0]
            avg_pkg = round(sum(sals) / len(sals), 2) if sals else 0.0
            companies_list.append({
                'company_name': cname,
                'roles_count': len(details['roles']),
                'roles': list(details['roles']),
                'max_package': details['max_package'],
                'min_package': min_pkg,
                'avg_package': avg_pkg,
                'placed_count': details['placed_count'],
                'locations': list(details['locations']),
                'students_placed': details['placed_count'],
            })
            company_rankings.append({
                'company_name': cname,
                'placed_count': details['placed_count'],
                'max_package': details['max_package'],
                'avg_package': avg_pkg,
            })

        companies_list = sorted(companies_list, key=lambda x: x['company_name'])
        
        # Filter rankings for companies with actual placements
        placed_companies = [c for c in company_rankings if c['placed_count'] > 0]
        
        if placed_companies:
            company_rankings_by_count = sorted(placed_companies, key=lambda x: (-x['placed_count'], -x['max_package']))[:10]
            company_rankings_by_salary = sorted(placed_companies, key=lambda x: -x['max_package'])[:10]
        else:
            company_rankings_by_count = sorted(company_rankings, key=lambda x: (-x['placed_count'], -x['max_package']))[:10]
            company_rankings_by_salary = sorted(company_rankings, key=lambda x: -x['max_package'])[:10]

        top_company = company_rankings_by_count[0] if company_rankings_by_count else {}
        highest_paying_company = company_rankings_by_salary[0] if company_rankings_by_salary else {}

        # Job Role Rankings
        role_rankings = sorted(
            [{'role': r, 'count': c} for r, c in role_counts.items()],
            key=lambda x: -x['count']
        )[:10]

        # ============== LOCATION DISTRIBUTION ==============
        location_stats = []
        for loc, details in location_details.items():
            avg_sal = round(sum(details['salaries']) / len(details['salaries']), 2) if details['salaries'] else 0.0
            location_stats.append({
                'location': loc,
                'job_count': details['jobs'],
                'avg_salary': avg_sal,
                'max_salary': max(details['salaries']) if details['salaries'] else 0.0
            })

        # ============== RECENT DATA ==============
        recent_apps = Application.objects.filter(is_deleted=False).select_related('student', 'job').order_by('-applied_at')[:5]
        recent_jobs = Job.objects.all().order_by('-updated_at')[:5]
        upcoming_deadlines = Job.objects.filter(status='active', application_deadline__gt=timezone.now()).order_by('application_deadline')[:5]

        # Calculate placement rate among eligible students safely
        placed_eligible_count = len(placed_student_ids & eligible_student_ids)

        # ──────────── FINAL RESPONSE ────────────
        return Response({
            # Legacy fields (kept for backward compat with old Dashboard.jsx)
            'total_students': total_students,
            'placed_students': placed_count,
            'placement_rate': placement_rate,
            'total_companies': total_companies,
            'total_job_applications': total_job_applications,
            'salary_stats': {
                'max_salary': max_salary,
                'min_salary': min_salary,
                'avg_salary': avg_salary,
            },
            'salary_distribution': sal_dist,
            'course_wise_stats': course_wise_stats,
            'year_wise_stats': year_wise_stats,
            'monthly_placement_trend': monthly_trend,
            'companies_list': companies_list,
            'recent_applications': [{
                'id': str(app.id),
                'student_name': app.student.name,
                'company_name': app.job.company_name,
                'role': app.job.role,
                'status': app.status,
                'applied_at': app.applied_at,
            } for app in recent_apps],

            # ── New structured sections ──
            'overview': {
                'total_students': total_students,
                'placed_students': placed_count,
                'placement_rate': placement_rate,
                'total_placements': total_placements,
                'total_applications': total_job_applications,
                'total_companies': total_companies,
                'total_assignments': total_assignments,
                'not_applied': not_applied_count,
                
                # New fields for Admin Overview tab
                'total_jobs': total_jobs,
                'total_openings': total_openings,
                'placed_on_campus': placed_on_campus_count,
                'placed_off_campus': placed_off_campus_count,
                'total_not_placed': total_students - placed_count,
                'jobs_active': jobs_active,
                'jobs_complete': jobs_complete,
                'jobs_on_hold': jobs_on_hold,
            },
            'placement_overview': {
                'total_students': total_students,
                'unique_learners_applying': unique_learners_applying,
                'learners_not_applying': learners_not_applying,
                'placed_learners': placed_count,
                'placed_learners_pct': round((placed_count / total_students * 100), 1) if total_students else 0.0,
                'placed_on_campus': placed_on_campus_count,
                'placed_on_campus_pct': round((placed_on_campus_count / total_students * 100), 1) if total_students else 0.0,
                'placed_off_campus': placed_off_campus_count,
                'placed_off_campus_pct': round((placed_off_campus_count / total_students * 100), 1) if total_students else 0.0,
                'learners_not_placed': total_students - placed_count,
                'learners_not_placed_pct': round(((total_students - placed_count) / total_students * 100), 1) if total_students else 0.0,
                'placement_rate_eligible': round((placed_eligible_count / eligible_students * 100), 1) if eligible_students else 0.0,
                'total_offers_received': total_offers_received,
                'offer_letters_uploaded': offer_letters_uploaded,
                'offer_letters_not_uploaded': offer_letters_not_uploaded,
            },
            'funnel_breakdown': {
                'total_applications': total_job_applications,
                'applied': app_status_counts.get('applied', 0),
                'shortlist': app_status_counts.get('shortlisted', 0),
                'in_interview': app_status_counts.get('interviewing', 0),
                'offered': app_status_counts.get('selected', 0),
                'joined': app_status_counts.get('accepted', 0),
                'on_hold': app_status_counts.get('withdrawn', 0),
                'rejected': app_status_counts.get('rejected', 0),
            },
            'participation_metrics': {
                'total_applications_submitted': total_job_applications,
                'avg_applications_per_learner': round(total_job_applications / unique_learners_applying, 2) if unique_learners_applying else 0.0,
                'application_to_shortlist_ratio': round((app_status_counts.get('shortlisted', 0) / total_job_applications * 100), 2) if total_job_applications else 0.0,
                'application_to_interview_ratio': round(((app_status_counts.get('shortlisted', 0) + app_status_counts.get('interviewing', 0)) / total_job_applications * 100), 2) if total_job_applications else 0.0,
                'offers_candidates_pct': round((app_status_counts.get('selected', 0) / total_job_applications * 100), 2) if total_job_applications else 0.0,
                'students_with_no_applications': not_applied_count,
                'students_with_no_applications_pct': round((not_applied_count / total_students * 100), 1) if total_students else 0.0,
            },
            'employer_salary_analysis': {
                'avg_ctc': avg_ctc_employer,
                'median_ctc': median_ctc_employer,
                'min_ctc': min_ctc_employer,
                'max_ctc': max_ctc_employer,
            },
            'status_metrics': status_metrics,
            'salary_analysis': {
                'avg_package': avg_salary,
                'highest_package': max_salary,
                'lowest_package': min_salary,
                'median_package': median_salary,
                'most_common_salary': most_common_salary,
                'highest_paid_role': highest_paid_role,
                'salary_distribution': sal_dist,
                'salary_bands_detailed': salary_bands_detailed,
            },
            'application_status': {
                'placement_status': placement_status_dist,
                'application_status': app_status_dist,
            },
            'course_performance': course_wise_stats,
            'course_rankings': course_rankings,
            'best_performing_course': best_course,
            'semester_stats': semester_wise_stats,
            'year_wise_stats': year_wise_stats,
            'student_demographics': {
                'cgpa_stats': cgpa_stats,
                'cgpa_distribution': cgpa_dist,
                'cgpa_placement_rates': cgpa_placement_rates,
                'attendance_stats': attendance_stats,
                'backlog_analysis': {
                    'with_backlogs': students_with_backlogs,
                    'without_backlogs': students_without_backlogs,
                },
                'category_distribution': category_dist,
            },
            'interview_rounds': {
                'round_performance': round_stats,
                'round_types': round_types,
            },
            'timeline_trends': {
                'monthly_placements': monthly_trend,
                'application_timeline': application_timeline,
                'extras': timeline_extras,
            },
            'eligibility': eligibility_detail,
            'company_analysis': {
                'total_companies': len(company_details),
                'top_companies': company_rankings_by_count,
                'top_company': top_company,
                'highest_paying_company': highest_paying_company,
                'top_companies_by_count': company_rankings_by_count,
                'top_companies_by_salary': company_rankings_by_salary,
                'companies_list': companies_list,
            },
            'job_distribution': {
                'by_job_type': dict(job_type_dist),
                'by_listing_type': dict(listing_type_dist),
                'role_rankings': role_rankings,
            },
            'location_analysis': location_stats,
            'recent_data': {
                'recent_jobs': [{
                    'id': str(job.id),
                    'company_name': job.company_name,
                    'role': job.role,
                    'package': float(job.package),
                    'deadline': job.application_deadline,
                    'status': job.status,
                } for job in recent_jobs],
                'recent_applications': [{
                    'id': str(app.id),
                    'student_name': app.student.name,
                    'company_name': app.job.company_name,
                    'role': app.job.role,
                    'status': app.status,
                    'applied_at': app.applied_at,
                } for app in recent_apps],
                'upcoming_deadlines': [{
                    'id': str(job.id),
                    'company_name': job.company_name,
                    'role': job.role,
                    'deadline': job.application_deadline,
                } for job in upcoming_deadlines],
            },
        })

    @action(detail=False, methods=['get'], url_path='reports')
    def reports(self, request):
        """Export comprehensive placement report as CSV data."""
        applications = Application.objects.filter(is_deleted=False).select_related('student', 'job').all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'Student Name', 'Reg No', 'Course', 'CGPA',
            'Company', 'Position', 'Salary', 'Status', 'Drive Type'
        ])
        
        # Write external applications
        for app in applications:
            writer.writerow([
                app.student.name, app.student.registration_number,
                app.student.course, app.student.cgpa,
                app.job.company_name, app.job.role,
                self._to_lpa(app.job.package) if app.job.package else '', app.status,
                'External Application' if app.job.job_type == 'external' else 'Internal Job Posting'
            ])
            
        return Response({
            'csv': output.getvalue(),
            'filename': 'placement_report.csv',
        })


class AuditLogViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrCoordinator]

    @action(detail=False, methods=['get'], url_path='list')
    def list_logs(self, request):
        """View recent audit log entries."""
        logs = AuditLog.objects.select_related('user').all()[:100]
        return Response(AuditLogSerializer(logs, many=True).data)
