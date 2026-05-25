# Comprehensive Placement Dashboard - KPI Documentation

## Overview

The admin dashboard has been significantly enhanced with **13 comprehensive KPI categories** covering all aspects of placement analytics. This document outlines all available metrics and their definitions.

---

## 1. Overview & Core KPIs

### Total Students
- **Definition:** Total number of students registered in the system
- **Calculation:** `Student.objects.count()`
- **Usage:** Baseline metric for all calculations

### Placed Students
- **Definition:** Unique students who received offers (selected or accepted status)
- **Calculation:** Union of `PlacementAssignment(status='selected')` and `Application(status in ['selected', 'accepted'])`
- **Usage:** Key success metric

### Placement Rate (%)
- **Definition:** Percentage of students who got placed
- **Calculation:** `(placed_students / total_students) * 100`
- **Range:** 0-100%

### Total Companies
- **Definition:** Number of unique companies recruiting
- **Calculation:** `Job.objects.values('company_name').distinct().count()`
- **Usage:** Recruiting diversity metric

### Total Applications
- **Definition:** Total job applications submitted by students
- **Calculation:** `Application.objects.count()`
- **Usage:** Engagement metric

---

## 2. Salary Analysis

### Highest Package (LPA)
- **Definition:** Maximum salary offered by any company
- **Calculation:** `max(all_salaries)`
- **Unit:** Lakhs Per Annum (LPA)

### Lowest Package (LPA)
- **Definition:** Minimum salary offered by any company
- **Calculation:** `min(all_salaries)`
- **Unit:** LPA

### Average Package (LPA)
- **Definition:** Mean salary across all offers
- **Calculation:** `sum(all_salaries) / len(all_salaries)`
- **Unit:** LPA

### Median Package (LPA)
- **Definition:** Middle value of sorted salary distribution
- **Calculation:** Sorted salaries[n/2]
- **Unit:** LPA
- **Advantage:** Resistant to outliers

### Salary Distribution (Brackets)
- **Brackets:** 
  - `< 3 LPA`
  - `3 - 6 LPA`
  - `6 - 10 LPA`
  - `10+ LPA`
- **Usage:** Understanding package range distribution

### Salary Bands
- **Definition:** Count of packages in each 1-LPA range (e.g., "5-6 LPA", "6-7 LPA")
- **Usage:** Granular salary distribution analysis

### Salary by Course
- **Definition:** Average salary for each course
- **Calculation:** Aggregated from `PlacementAssignment` and `Application` filtered by course
- **Usage:** Course-wise revenue analysis

---

## 3. Application Status Distribution

### Status Categories
- **Applied:** Initial application submitted
- **Shortlisted:** Candidate selected for interview rounds
- **Rejected:** Application rejected by company
- **Selected:** Offer received (internals)
- **Accepted:** Offer accepted by student
- **Withdrawn:** Application withdrawn

### Pie Chart Distribution
Shows percentage breakdown of all applications across these statuses.

---

## 4. Course/Stream Performance

### Course-wise Metrics
For each course (e.g., CSE, ECE, Mechanical):

- **Total Students:** Count of students in course
- **Placed Students:** Students from course who got offers
- **Placement Rate:** `(placed / total) * 100`
- **Avg Salary:** Average package for course

### Rankings
Courses ranked by:
1. Placement rate (ascending)
2. Average salary (descending)

---

## 5. Semester-wise Statistics

### Semester Distribution
Placement statistics broken down by semester (1-8):

- **Total Students:** Students in semester
- **Placed:** Students placed from semester
- **Placement Rate:** Success percentage for semester

### Usage
Identify which semesters have better placement outcomes.

---

## 6. Year-wise (Batch) Statistics

### Batch-based Metrics
Organized by passing_year (graduation year):

- **Total Students:** Students graduating in year
- **Placed:** Students placed from batch
- **Placement Rate:** Year-over-year success percentage

### Trend Analysis
Compare placement trends across different batches.

---

## 7. Student Demographics

### CGPA Analysis
- **Average CGPA:** Mean GPA across all students
- **Max CGPA:** Highest GPA
- **Min CGPA:** Lowest GPA
- **Range:** 0-10 scale

### CGPA Distribution
Brackets:
- `< 6.0`
- `6.0 - 7.0`
- `7.0 - 8.0`
- `8.0 - 9.0`
- `9.0+`

### Attendance Analysis
- **Average Attendance:** Mean attendance percentage
- **Range:** 0-100%

### Backlog Status
- **With Backlogs:** Count of students having backlogs
- **Without Backlogs:** Count of students without backlogs
- **Usage:** Eligibility filtering

### Category Distribution
Breakdown by student category (e.g., Category A, B, C)

---

## 8. Interview Rounds

### Round Performance Metrics
For each interview round:

- **Total Applications:** Number of candidates in round
- **Cleared:** Candidates who cleared round
- **Failed:** Candidates who failed round
- **Clearance Rate:** `(cleared / total) * 100`
- **Average Score:** Mean score (0-100)

### Round Types
- **Test:** Written/Online test
- **Interview:** Technical/HR interview
- **Group Discussion:** Group discussion round
- **Assignment:** Take-home assignment

### Drop-off Analysis
Calculate drop-off rate between consecutive rounds.

---

## 9. Timeline & Trends

### Monthly Placements Trend
- **Data:** Placements by month (last 12 months)
- **Calculation:** Count applications/assignments selected per month
- **Visualization:** Line chart showing trend

### Application Timeline
- **Data:** Applications submitted per month
- **Calculation:** Count applications created per month
- **Visualization:** Bar chart showing application volume

### Trend Analysis
- Identify peak recruitment months
- Analyze seasonal patterns
- Forecast future placements

---

## 10. Eligibility & Requirements

### Eligible Students Count
Students meeting ALL criteria:
- CGPA ≥ 6.0
- Attendance ≥ 75%
- No backlogs

### Ineligibility Reasons
Distribution of disqualification reasons:
- `CGPA Below 6.0`
- `Attendance Below 75%`
- `Has Backlogs`

### Eligibility Match %
Percentage of students eligible for placements.

---

## 11. Company Analysis

### Top Companies
Ranked by:
1. Placement count (descending)
2. Max package (descending)

Metrics per company:
- **Company Name:** Recruiting organization
- **Placed Count:** Students hired
- **Max Package:** Highest salary offered
- **Min Package:** Lowest salary offered
- **Avg Package:** Average salary
- **Roles Count:** Number of positions offered
- **Locations:** Cities/regions recruiting from

### Company Rankings
1. By placements (most to least)
2. By max package (highest to lowest)

### Students per Company
Count of students placed in each company.

---

## 12. Job Type Distribution

### Internal vs External
- **Internal:** Campus placements
- **External:** Off-campus/lateral opportunities
- **Usage:** Recruitment channel analysis

### Job vs Internship
- **Job:** Full-time/permanent positions
- **Internship:** Internship opportunities
- **Usage:** Career path analysis

---

## 13. Location Distribution

### Jobs by Location
For each location/city:

- **Location:** City/region name
- **Job Count:** Number of job postings from location
- **Avg Salary:** Average package from location
- **Max Salary:** Highest salary from location

### Location Rankings
Rank locations by:
1. Job availability
2. Average salary
3. Max salary

---

## Data Collection & Aggregation

### Source Models
- **Student:** Demographics (CGPA, attendance, backlogs, course, category, year)
- **Placement:** Internal placements (salary, company, position)
- **PlacementAssignment:** Assignment tracking (status, dates)
- **Job:** External job postings (package, location, type)
- **Application:** Job applications (status, dates, rounds)
- **ApplicationRound:** Interview rounds (status, score, feedback)
- **JobRound:** Interview structure (round type, passing score)

### Calculation Approach
1. **Aggregation:** Django ORM (Count, Avg, Max, Min)
2. **Filtering:** Status-based filtering (selected, accepted, etc.)
3. **Deduplication:** Union of internal and external placements
4. **Salary Standardization:** Convert Rupees to LPA (values ≥ 1000 ÷ 100000)

---

## API Response Structure

```json
{
  "overview": {
    "total_students": number,
    "placed_students": number,
    "placement_rate": percentage,
    ...
  },
  "salary_analysis": {
    "avg_package": float,
    "highest_package": float,
    ...
  },
  "application_status": {...},
  "course_performance": [...],
  "semester_stats": [...],
  "year_wise_stats": [...],
  "student_demographics": {...},
  "interview_rounds": {...},
  "timeline_trends": {...},
  "eligibility": {...},
  "company_analysis": {...},
  "job_distribution": {...},
  "location_analysis": [...]
}
```

---

## Frontend Tabs

### 1. Overview Tab
- Core KPIs cards
- Application status pie chart
- Salary distribution
- Course placement rates
- Semester statistics

### 2. Salary Analysis Tab
- High/low/avg/median packages
- Salary bracket distribution
- Salary band ranges
- Salary by course table

### 3. Demographics Tab
- CGPA statistics and distribution
- Attendance metrics
- Backlog analysis
- Category distribution
- Year-wise statistics

### 4. Interviews Tab
- Round performance table
- Interview types pie chart
- Clearance rates by round
- Average scores per round

### 5. Trends Tab
- Monthly placements chart
- Application timeline chart
- Seasonal trend analysis

### 6. Eligibility Tab
- Eligible student count
- Ineligibility reasons
- Eligibility percentage

### 7. Locations Tab
- Jobs by location table
- Salary by location
- Location rankings

---

## Usage Instructions

### Accessing the Dashboard
1. Login as Admin or Coordinator
2. Navigate to `/admin` or click "Dashboard" from sidebar
3. Dashboard opens with Overview tab selected

### Switching Tabs
- Click tab headers: Overview, Salary Analysis, Demographics, etc.
- Tab content updates with relevant metrics

### Interpreting Metrics
- **Green indicators:** Positive trends (✓ high placement rate)
- **Red indicators:** Warning signs (✗ low salary)
- **Orange/Yellow:** Neutral or informational

### Exporting Data
- Click "Export" button for CSV download (if enabled)
- Export includes all visible metrics

---

## Performance Optimization

### Database Queries
- Uses `select_related()` for FK joins
- Aggregation queries for bulk calculations
- Efficient filtering with Q objects

### Frontend Rendering
- Component-based architecture
- Memoization for expensive calculations
- Lazy loading for large datasets

---

## Future Enhancements

1. **Real-time Updates:** WebSocket for live KPI updates
2. **Custom Filters:** Date range, company, course filters
3. **Drill-down Analytics:** Click metrics to see underlying student data
4. **Predictive Analytics:** ML-based forecasting
5. **Benchmarking:** Compare against industry standards
6. **Export Formats:** PDF, Excel, PowerPoint
7. **Custom Reports:** User-defined KPI combinations
8. **Alert System:** Notifications for low metrics
9. **Mobile Dashboard:** Responsive mobile view
10. **Historical Comparison:** YoY and MoM trends

---

## Troubleshooting

### Data Not Loading
- Check backend API `/dashboard/stats/`
- Verify database has data (students, jobs, applications)
- Check browser console for errors

### Incorrect Calculations
- Verify student CGPA and attendance data
- Check PlacementAssignment status values
- Ensure date fields are populated

### Performance Issues
- Consider caching dashboard API response
- Implement pagination for large datasets
- Optimize database indexes

---

## Questions & Support

For issues or feature requests related to the dashboard, contact the development team.

**Last Updated:** May 21, 2026
