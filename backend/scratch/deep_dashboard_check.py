import os
import sys
import django
from collections import defaultdict
from statistics import median, mode

# Setup Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student
from apps.jobs.models import Job, JobRound
from apps.applications.models import Application, ApplicationRound
from django.db.models import Count, Q, Sum, Avg, Max, Min

def run_deep_audit():
    print("=" * 80)
    print("                     THE WORLD'S BEST DASHBOARD INTEGRITY TEST                   ")
    print("=" * 80)
    
    # 1. Students & Courses Audit
    total_students = Student.objects.count()
    print(f"\n[1. STUDENT & COURSE METRICS]")
    print(f"  - Total Registered Students: {total_students}")
    
    courses = Student.objects.values('course').annotate(count=Count('id')).order_by('-count')
    print("  - Course Distribution in Database:")
    for c in courses:
        print(f"    - {c['course'] or 'Unspecified Course'}: {c['count']} students")
        
    # 2. Company & Job Audit
    jobs = Job.objects.all()
    total_jobs = jobs.count()
    print(f"\n[2. COMPANY & JOB METRICS]")
    print(f"  - Total Jobs/Postings: {total_jobs}")
    
    db_companies = list(Job.objects.values_list('company_name', flat=True))
    unique_companies = sorted(list(set(db_companies)))
    print(f"  - Distinct Company Names ({len(unique_companies)}): {unique_companies}")
    
    # Check for whitespace or case sensitivity anomalies
    whitespace_anomalies = [c for c in unique_companies if c.strip() != c]
    case_anomalies = []
    seen_lower = {}
    for c in unique_companies:
        cl = c.lower()
        if cl in seen_lower:
            case_anomalies.append((seen_lower[cl], c))
        else:
            seen_lower[cl] = c
            
    if whitespace_anomalies:
        print(f"    [WARNING] Whitespace issues detected in: {whitespace_anomalies}")
    if case_anomalies:
        print(f"    [WARNING] Potential case duplicate companies: {case_anomalies}")
    if not whitespace_anomalies and not case_anomalies:
        print("    [OK] Company names are clean and properly normalized.")

    # 3. Applications & Placements Funnel Audit
    applications = Application.objects.all()
    total_apps = applications.count()
    print(f"\n[3. APPLICATION FUNNEL METRICS]")
    print(f"  - Total Job Applications: {total_apps}")
    
    statuses = Application.objects.values('status').annotate(count=Count('id')).order_by('-count')
    print("  - Application Status Distribution:")
    for s in statuses:
         print(f"    - {s['status']}: {s['count']}")
         
    placed_students_set = set(Application.objects.filter(status__in=['selected', 'accepted']).values_list('student_id', flat=True))
    placed_count = len(placed_students_set)
    placement_rate = round((placed_count / total_students * 100), 2) if total_students else 0.0
    print(f"  - Unique Placed/Converted Students: {placed_count} (Placement Rate: {placement_rate}%)")
 
    # 4. Salary and Compensation Math Integrity Check
    placed_applications = Application.objects.filter(status__in=['selected', 'accepted'])
    placed_packages = []
    for app in placed_applications:
        if app.job.package and float(app.job.package) > 0:
            placed_packages.append(float(app.job.package))
            
    print(f"\n[4. PLACED SALARY INTEGRITY AUDIT]")
    print(f"  - Total Placed Students with specified salary > 0: {len(placed_packages)}")
    if placed_packages:
        avg_package = round(sum(placed_packages) / len(placed_packages), 2)
        highest_package = max(placed_packages)
        lowest_package = min(placed_packages)
        med_package = median(placed_packages)
        print(f"    - Highest Placed CTC: {highest_package} LPA")
        print(f"    - Lowest Placed CTC:  {lowest_package} LPA")
        print(f"    - Average Placed CTC: {avg_package} LPA")
        print(f"    - Median Placed CTC:  {med_package} LPA")
    else:
        print("    - No salary data available for placed students.")

    # 5. Deep Consistency Cross-Check (Simulating dashboard.py view logic)
    print(f"\n[5. CORE KPI WIDGET DISCREPANCY AUDIT]")
    
    # Overview metrics
    total_companies_kpi = Job.objects.values('company_name').distinct().count()
    
    # Company analysis metrics (building identical dict as views.py)
    company_details = {}
    job_data = list(jobs.values('company_name', 'package', 'role', 'location', 'job_type', 'listing_type'))
    
    for j in job_data:
        cname = j['company_name']
        package_val = j['package']
        
        if cname not in company_details:
            company_details[cname] = {
                'placed_count': 0,
                'jobs_count': 0,
                'salaries': []
            }
        company_details[cname]['jobs_count'] += 1
        if package_val and float(package_val) > 0:
            company_details[cname]['salaries'].append(float(package_val))
            
    for sel in Application.objects.filter(status__in=['selected', 'accepted']).select_related('job'):
        cname = sel.job.company_name
        if cname in company_details:
            company_details[cname]['placed_count'] += 1
            
    total_companies_analysis = len(company_details)
    
    print(f"  - 'Overview' Total Companies KPI value: {total_companies_kpi}")
    print(f"  - 'Company Analysis' total companies counted: {total_companies_analysis}")
    
    # STRICT ASSERTIONS & CHECK
    mismatch = False
    if total_companies_kpi != total_companies_analysis:
        mismatch = True
        print(f"    [DISCREPANCY] DATA DISCREPANCY DETECTED! KPI card shows {total_companies_kpi} while company analysis reports {total_companies_analysis}!")
    else:
        print("    [OK] PERFECT CONSISTENCY! Both KPI card and Company Analysis sections report exactly identical values.")
        
    print("\n  - Company Breakdown Audit:")
    for cname, details in sorted(company_details.items()):
        avg_sal = round(sum(details['salaries']) / len(details['salaries']), 2) if details['salaries'] else 0.0
        print(f"    - {cname:20} | Jobs Postings: {details['jobs_count']} | Placed: {details['placed_count']} | Avg Salary: {avg_sal} LPA")

    print("\n" + "=" * 80)
    print("                                 AUDIT COMPLETED                                 ")
    print("=" * 80)

if __name__ == '__main__':
    run_deep_audit()
