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

from ..models import Student, Placement, PlacementAssignment, AuditLog
from apps.jobs.models import Job, JobRound
from apps.applications.models import Application, ApplicationRound
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

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Comprehensive placement dashboard statistics with all KPIs."""

        # ============== OVERVIEW & KPIs ==============
        total_students = Student.objects.count()
        total_placements = Placement.objects.count()
        total_assignments = PlacementAssignment.objects.count()
        total_job_applications = Application.objects.count()
        total_companies = Job.objects.values('company_name').distinct().count()
        total_jobs = Job.objects.count()

        # Total Openings Count (sum of openings across all jobs)
        total_openings = Job.objects.aggregate(total=Sum('openings_count'))['total'] or 0

        # Placed Students (Unique IDs who are selected/accepted)
        placed_students_assignments = set(
            PlacementAssignment.objects.filter(status='selected').values_list('student_id', flat=True)
        )
        placed_students_applications = set(
            Application.objects.filter(status__in=['selected', 'accepted']).values_list('student_id', flat=True)
        )
        placed_student_ids = placed_students_assignments | placed_students_applications
        placed_count = len(placed_student_ids)
        placement_rate = round((placed_count / total_students * 100), 1) if total_students else 0.0

        # On-Campus vs Off-Campus Placed Learners
        placed_students_applications_internal = set(
            Application.objects.filter(status__in=['selected', 'accepted'], job__job_type='internal').values_list('student_id', flat=True)
        )
        placed_on_campus_ids = placed_students_assignments | placed_students_applications_internal
        placed_on_campus_count = len(placed_on_campus_ids)

        placed_students_applications_external = set(
            Application.objects.filter(status__in=['selected', 'accepted'], job__job_type='external').values_list('student_id', flat=True)
        )
        placed_off_campus_ids = placed_students_applications_external - placed_on_campus_ids
        placed_off_campus_count = len(placed_off_campus_ids)

        # Job statuses (Active, COMPLETE/Closed, On Hold/Draft)
        jobs_active = Job.objects.filter(status='active').count()
        jobs_complete = Job.objects.filter(status='closed').count()
        jobs_on_hold = Job.objects.filter(status='draft').count()

        # Participation & funnel metrics
        unique_learners_applying = Application.objects.values('student_id').distinct().count()
        learners_not_applying = total_students - unique_learners_applying
        
        total_offers_received = Application.objects.filter(status__in=['selected', 'accepted']).count() + PlacementAssignment.objects.filter(status='selected').count()
        offer_letters_uploaded = Application.objects.filter(status__in=['selected', 'accepted'], offer_letter_uploaded=True).count()
        offer_letters_not_uploaded = max(0, total_offers_received - offer_letters_uploaded)

        # ============== STATUS METRICS ==============
        # Map application statuses to the dashboard metric names
        app_status_counts = dict(
            Application.objects.values('status').annotate(c=Count('id')).values_list('status', 'c')
        )
        assign_status_counts = dict(
            PlacementAssignment.objects.values('status').annotate(c=Count('id')).values_list('status', 'c')
        )

        # Applied Count = applied in both systems
        applied_count = (
            app_status_counts.get('applied', 0) +
            assign_status_counts.get('applied', 0) +
            assign_status_counts.get('assigned', 0)
        )
        # In Interview = shortlisted (waiting for rounds)
        in_interview = (
            app_status_counts.get('shortlisted', 0) +
            assign_status_counts.get('shortlisted', 0)
        )
        # Offer Received = selected (not yet accepted)
        offer_received = app_status_counts.get('selected', 0) + assign_status_counts.get('selected', 0)
        # Offer Accepted = explicitly accepted
        offer_accepted = app_status_counts.get('accepted', 0)
        # Rejected
        rejected_count = (
            app_status_counts.get('rejected', 0) +
            assign_status_counts.get('rejected', 0)
        )
        # Withdrawn / Pending
        withdrawn_count = app_status_counts.get('withdrawn', 0)
        # Not Applied = students with zero applications and zero assignments
        students_with_apps = set(Application.objects.values_list('student_id', flat=True))
        students_with_assigns = set(PlacementAssignment.objects.values_list('student_id', flat=True))
        applied_student_ids = students_with_apps | students_with_assigns
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

        # ============== SALARY ANALYSIS ==============
        placement_data = list(Placement.objects.filter(salary__gt=0).values('company_name', 'salary', 'position'))
        job_data = list(Job.objects.filter(package__gt=0).values('company_name', 'package', 'role', 'location', 'job_type', 'listing_type'))

        all_salaries = []
        company_details = {}
        location_details = defaultdict(lambda: {'jobs': 0, 'salaries': []})
        job_type_dist = defaultdict(int)
        listing_type_dist = defaultdict(int)
        role_counts = defaultdict(int)

        # Process placements
        for p in placement_data:
            cname = p['company_name']
            lpa = self._to_lpa(p['salary'])
            if lpa > 0:
                all_salaries.append(lpa)
            if cname not in company_details:
                company_details[cname] = {
                    'roles': set(), 'max_package': 0.0, 'min_package': float('inf'),
                    'placed_count': 0, 'salaries': [], 'locations': set()
                }
            company_details[cname]['roles'].add(p['position'])
            company_details[cname]['salaries'].append(lpa)
            role_counts[p['position']] += 1
            if lpa > company_details[cname]['max_package']:
                company_details[cname]['max_package'] = lpa
            if lpa > 0 and lpa < company_details[cname]['min_package']:
                company_details[cname]['min_package'] = lpa

        # Process jobs
        for j in job_data:
            cname = j['company_name']
            lpa = self._to_lpa(j['package'])
            if lpa > 0:
                all_salaries.append(lpa)
            if cname not in company_details:
                company_details[cname] = {
                    'roles': set(), 'max_package': 0.0, 'min_package': float('inf'),
                    'placed_count': 0, 'salaries': [], 'locations': set()
                }
            company_details[cname]['roles'].add(j['role'])
            company_details[cname]['salaries'].append(lpa)
            role_counts[j['role']] += 1
            if lpa > company_details[cname]['max_package']:
                company_details[cname]['max_package'] = lpa
            if lpa > 0 and lpa < company_details[cname]['min_package']:
                company_details[cname]['min_package'] = lpa
            company_details[cname]['locations'].add(j.get('location', 'Unknown'))
            location_details[j.get('location', 'Unknown')]['jobs'] += 1
            location_details[j.get('location', 'Unknown')]['salaries'].append(lpa)
            job_type_dist[j.get('job_type', 'unknown')] += 1
            listing_type_dist[j.get('listing_type', 'job')] += 1

        # Count placed students per company
        for sel in PlacementAssignment.objects.filter(status='selected').select_related('placement'):
            cname = sel.placement.company_name
            if cname in company_details:
                company_details[cname]['placed_count'] += 1

        for sel in Application.objects.filter(status__in=['selected', 'accepted']).select_related('job'):
            cname = sel.job.company_name
            if cname in company_details:
                company_details[cname]['placed_count'] += 1

        # Salary statistics
        sorted_salaries = sorted(all_salaries)
        max_salary = max(all_salaries) if all_salaries else 0.0
        min_salary = min(all_salaries) if all_salaries else 0.0
        avg_salary = round(sum(all_salaries) / len(all_salaries), 2) if all_salaries else 0.0
        median_salary = sorted_salaries[len(sorted_salaries) // 2] if sorted_salaries else 0.0

        # Employer Salary statistics
        job_packages = [self._to_lpa(p) for p in Job.objects.filter(package__gt=0).values_list('package', flat=True)]
        avg_ctc_employer = round(sum(job_packages) / len(job_packages), 2) if job_packages else 0.0
        sorted_job_packages = sorted(job_packages)
        median_ctc_employer = sorted_job_packages[len(sorted_job_packages) // 2] if sorted_job_packages else 0.0
        min_ctc_employer = min(job_packages) if job_packages else 0.0
        max_ctc_employer = max(job_packages) if job_packages else 0.0

        # Most common salary
        if all_salaries:
            from statistics import mode
            try:
                most_common_salary = mode(round(s, 0) for s in all_salaries)
            except Exception:
                most_common_salary = round(avg_salary, 1)
        else:
            most_common_salary = 0.0

        # Salary distribution brackets (original)
        sal_dist = {'< 3 LPA': 0, '3 - 6 LPA': 0, '6 - 10 LPA': 0, '10+ LPA': 0}
        # Detailed salary bands as per spec
        salary_bands_detailed = {
            '4–6 LPA': 0, '6–8 LPA': 0, '8–10 LPA': 0,
            '10–12 LPA': 0, '12+ LPA': 0
        }

        for sal in all_salaries:
            # Original brackets
            if sal < 3.0:
                sal_dist['< 3 LPA'] += 1
            elif sal <= 6.0:
                sal_dist['3 - 6 LPA'] += 1
            elif sal <= 10.0:
                sal_dist['6 - 10 LPA'] += 1
            else:
                sal_dist['10+ LPA'] += 1
            # Detailed bands
            if 4.0 <= sal < 6.0:
                salary_bands_detailed['4–6 LPA'] += 1
            elif 6.0 <= sal < 8.0:
                salary_bands_detailed['6–8 LPA'] += 1
            elif 8.0 <= sal < 10.0:
                salary_bands_detailed['8–10 LPA'] += 1
            elif 10.0 <= sal < 12.0:
                salary_bands_detailed['10–12 LPA'] += 1
            elif sal >= 12.0:
                salary_bands_detailed['12+ LPA'] += 1

        # Highest paid role
        highest_paid_role = ''
        highest_role_salary = 0.0
        for p in placement_data:
            lpa = self._to_lpa(p['salary'])
            if lpa > highest_role_salary:
                highest_role_salary = lpa
                highest_paid_role = p['position']
        for j in job_data:
            lpa = self._to_lpa(j['package'])
            if lpa > highest_role_salary:
                highest_role_salary = lpa
                highest_paid_role = j['role']

        # ============== APPLICATION STATUS ==============
        placement_status_dist = dict(
            PlacementAssignment.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )
        app_status_dist = dict(
            Application.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )

        # ============== COURSE/STREAM PERFORMANCE ==============
        students_by_course = Student.objects.values('course').annotate(total=Count('id'))
        course_wise_stats = []

        for item in students_by_course:
            course = item['course'] or 'Unknown'
            total = item['total']
            placed_in_course = Student.objects.filter(id__in=placed_student_ids, course=course).count()
            rate = round((placed_in_course / total * 100), 1) if total else 0.0

            course_salaries = []
            for placement in Placement.objects.filter(assignments__student__course=course, salary__gt=0).distinct():
                course_salaries.append(self._to_lpa(placement.salary))
            for app in Application.objects.filter(student__course=course, job__package__gt=0, status__in=['selected', 'accepted']):
                course_salaries.append(self._to_lpa(app.job.package))

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
        all_rounds = ApplicationRound.objects.select_related('application', 'job_round')
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

        for dt in PlacementAssignment.objects.filter(status='selected').values_list('updated_date', flat=True):
            if dt:
                all_placement_dates.append(dt)
                m_str = dt.strftime('%b %Y')
                selection_months[m_str] = selection_months.get(m_str, 0) + 1

        for dt in Application.objects.filter(status__in=['selected', 'accepted']).values_list('updated_at', flat=True):
            if dt:
                all_placement_dates.append(dt)
                m_str = dt.strftime('%b %Y')
                selection_months[m_str] = selection_months.get(m_str, 0) + 1

        first_placement_date = min(all_placement_dates).strftime('%d %b %Y') if all_placement_dates else None
        last_placement_date = max(all_placement_dates).strftime('%d %b %Y') if all_placement_dates else None
        peak_month = max(selection_months, key=selection_months.get) if selection_months else None

        # Avg days to placement (from application to selection)
        placement_durations = []
        for app in Application.objects.filter(status__in=['selected', 'accepted']).exclude(applied_at__isnull=True):
            delta = (app.updated_at - app.applied_at).days
            if delta >= 0:
                placement_durations.append(delta)
        avg_days_to_placement = round(sum(placement_durations) / len(placement_durations), 1) if placement_durations else None

        try:
            sorted_months = sorted(selection_months.keys(), key=lambda x: datetime.strptime(x, '%b %Y'))
            monthly_trend = [{'month': m, 'placed_count': selection_months[m]} for m in sorted_months]
        except Exception:
            monthly_trend = [{'month': m, 'placed_count': selection_months[m]} for m in sorted(selection_months.keys())]

        app_dates = Application.objects.exclude(applied_at__isnull=True).values_list('applied_at', flat=True)
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

        # ============== ELIGIBILITY ==============
        eligible_students = 0
        ineligible_reasons = defaultdict(int)
        cgpa_not_met = 0
        attendance_not_met = 0
        backlog_disqualified = 0

        for student in Student.objects.all():
            eligible = True
            if student.cgpa and student.cgpa < 6.0:
                ineligible_reasons['CGPA Below 6.0'] += 1
                cgpa_not_met += 1
                eligible = False
            if student.attendance and student.attendance < 75:
                ineligible_reasons['Attendance Below 75%'] += 1
                attendance_not_met += 1
                eligible = False
            if student.backlogs:
                ineligible_reasons['Has Backlogs'] += 1
                backlog_disqualified += 1
                eligible = False
            if eligible:
                eligible_students += 1

        ineligible_students = total_students - eligible_students
        eligibility_compliance = round((eligible_students / total_students * 100), 1) if total_students else 0.0

        eligibility_detail = {
            'eligible_students': eligible_students,
            'ineligible_students': ineligible_students,
            'cgpa_not_met': cgpa_not_met,
            'attendance_not_met': attendance_not_met,
            'backlog_disqualified': backlog_disqualified,
            'course_not_eligible': 0,  # No course restriction data in model
            'eligibility_compliance_pct': eligibility_compliance,
            'ineligible_reasons': dict(ineligible_reasons),
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
        recent_apps = Application.objects.select_related('student', 'job').order_by('-applied_at')[:5]
        recent_jobs = Job.objects.all().order_by('-updated_at')[:5]
        upcoming_deadlines = Job.objects.filter(status='active', application_deadline__gt=timezone.now()).order_by('application_deadline')[:5]

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
                'placement_rate_eligible': round((placed_count / eligible_students * 100), 1) if eligible_students else 0.0,
                'total_offers_received': total_offers_received,
                'offer_letters_uploaded': offer_letters_uploaded,
                'offer_letters_not_uploaded': offer_letters_not_uploaded,
            },
            'funnel_breakdown': {
                'total_applications': total_job_applications,
                'in_interview': app_status_counts.get('shortlisted', 0) + app_status_counts.get('interviewing', 0),
                'joined': app_status_counts.get('accepted', 0),
                'offered': app_status_counts.get('selected', 0),
                'on_hold': app_status_counts.get('withdrawn', 0),
                'rejected': app_status_counts.get('rejected', 0),
                'shortlist': app_status_counts.get('shortlisted', 0),
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
        """Export placement report as CSV data."""
        assignments = PlacementAssignment.objects.select_related('student', 'placement').all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'Student Name', 'Reg No', 'Course', 'CGPA',
            'Company', 'Position', 'Salary', 'Status',
        ])
        for a in assignments:
            writer.writerow([
                a.student.name, a.student.registration_number,
                a.student.course, a.student.cgpa,
                a.placement.company_name, a.placement.position,
                str(a.placement.salary or ''), a.status,
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
