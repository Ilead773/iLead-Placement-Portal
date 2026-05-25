# iLEAD Placement Portal — Database Schema & KPI Available Fields

## Overview
The backend uses Django ORM with the following data tables. All models use UUID primary keys and include timestamps (`created_at`, `updated_at`).

---

## 1. CORE MODELS (`backend/core/models.py`)

### User
**Table**: `users`  
**Primary Role**: Authentication & authorization for admins, coordinators, and students.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| login_id | CharField (unique) | Lowercase unique identifier |
| email | EmailField (unique) | |
| name | CharField | Full name |
| role | CharField | admin / coordinator / student |
| is_active | BooleanField | Account status |
| is_staff | BooleanField | Django admin access |
| failed_login_attempts | IntegerField | For rate limiting |
| locked_until | DateTimeField | Account lock expiry |
| created_at | DateTimeField | Auto-set |
| updated_at | DateTimeField | Auto-set |

### Student
**Table**: `students`  
**Primary Role**: Core student demographics and academic performance.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user | OneToOne | Links to User |
| registration_number | CharField (unique) | Student ID |
| name | CharField | |
| email | EmailField (unique) | |
| **cgpa** | FloatField | Range: 0-10 ✅ **KPI Field** |
| **attendance** | FloatField | Range: 0-100 ✅ **KPI Field** |
| **backlogs** | BooleanField | Default: False ✅ **KPI Field** |
| **category** | CharField | A / B / C ✅ **KPI Field** |
| **year** | CharField | 1st / 2nd / 3rd / 4th ✅ **KPI Field** |
| course | CharField | Engineering, etc. |
| stream | CharField | CSE, ECE, etc. |
| semester | IntegerField | 1-12 |
| phone_number | CharField | |
| passing_year | IntegerField | Graduation year |
| created_at | DateTimeField | |
| updated_at | DateTimeField | |

### Placement (Legacy Model)
**Table**: `placements`  
**Note**: Appears to be superseded by the modern Jobs + Applications models.

| Field | Type | Notes |
|-------|------|-------|
| company_name | CharField | |
| position | CharField | |
| **salary** | DecimalField | ✅ **KPI Field** |
| required_cgpa | FloatField | Eligibility threshold |
| eligible_courses | CharField | Comma-separated |
| eligible_semesters | CharField | Comma-separated |
| application_deadline | DateTimeField | |

### PlacementAssignment (Legacy Model)
**Table**: `placement_assignments`  
**Status Choices**: `assigned`, `applied`, `shortlisted`, `rejected`, `selected`

### AuditLog
**Table**: `audit_logs`  
Tracks all important user actions (admin/coordinator edits).

| Field | Type | Notes |
|-------|------|-------|
| user | ForeignKey | User who performed action |
| action | CharField | Action description |
| details | TextField | Additional context |
| ip_address | GenericIPAddressField | |
| timestamp | DateTimeField | Auto-set |

### ExternalClickLog
**Table**: `external_click_logs`  
Tracks when students click external job links.

---

## 2. JOBS APP (`backend/apps/jobs/models.py`)

### Job
**Table**: `jobs`  
**Primary Role**: Job listings with requirements and eligibility.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| company_name | CharField | |
| company_website | URLField | |
| role | CharField | Job title |
| description | TextField | |
| **package** | DecimalField | Salary ✅ **KPI Field** |
| **location** | CharField | ✅ **KPI Field** |
| **job_type** | CharField | internal / external ✅ **KPI Field** |
| **listing_type** | CharField | job / internship ✅ **KPI Field** |
| duration | CharField | E.g., "3 months", "6 months" |
| external_link | URLField | If external |
| **eligibility_rules** | JSONField | ✅ **KPI Field** — Stored as JSON dict: |
| | | `{ min_cgpa, allowed_branches[], required_skills[], allowed_years[], no_backlog }` |
| application_deadline | DateTimeField | |
| status | CharField | draft / active / closed |
| created_by | ForeignKey | User (admin/coordinator) |
| created_at | DateTimeField | |
| updated_at | DateTimeField | |

### JobRound
**Table**: `job_rounds`  
**Primary Role**: Interview/test rounds for a job.

| Field | Type | Notes |
|-------|------|-------|
| job | ForeignKey | Links to Job |
| round_number | IntegerField | 1, 2, 3, ... |
| round_name | CharField | E.g., "Technical Round 1" |
| **round_type** | CharField | test / interview / group_discussion / assignment ✅ **KPI Field** |
| **is_elimination** | BooleanField | If False, round is informational |
| **passing_score** | IntegerField | Threshold to advance ✅ **KPI Field** |
| duration_minutes | IntegerField | Round duration |

---

## 3. APPLICATIONS APP (`backend/apps/applications/models.py`)

### Application
**Table**: `applications`  
**Primary Role**: Student-Job application with status tracking.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| student | ForeignKey | Links to Student |
| job | ForeignKey | Links to Job |
| **status** | CharField | applied / shortlisted / rejected / selected / accepted / withdrawn ✅ **KPI Field** |
| eligibility_snapshot | JSONField | Eligibility state at application time |
| job_snapshot | JSONField | Job details at application time |
| **applied_at** | DateTimeField | ✅ **KPI Field** |
| updated_at | DateTimeField | |
| **Unique Constraint**: (student, job) — one application per student per job |

### ApplicationRound
**Table**: `application_rounds`  
**Primary Role**: Student's progress through job rounds.

| Field | Type | Notes |
|-------|------|-------|
| application | ForeignKey | Links to Application |
| job_round | ForeignKey | Links to JobRound |
| round_number | IntegerField | 1, 2, 3, ... |
| **status** | CharField | pending / scheduled / cleared / failed / skipped ✅ **KPI Field** |
| **score** | IntegerField | 0-100 ✅ **KPI Field** |
| feedback | TextField | Interviewer/evaluator comments |
| scheduled_date | DateTimeField | Interview/test date |
| interview_link | URLField | Video call link, etc. |
| interviewer_name | CharField | |
| created_at | DateTimeField | |
| updated_at | DateTimeField | |

### ApplicationStatusHistory
**Table**: `application_status_histories`  
**Primary Role**: Audit trail for Application status changes.

| Field | Type | Notes |
|-------|------|-------|
| application | ForeignKey | |
| old_status | CharField | Previous status |
| new_status | CharField | New status |
| changed_by | ForeignKey | User who made change |
| notes | TextField | Change reason |
| timestamp | DateTimeField | |

### Notification
**Table**: `notifications`  
System notifications to students/coordinators.

| Field | Type | Notes |
|-------|------|-------|
| user | ForeignKey | Recipient |
| notification_type | CharField | E.g., "application_shortlisted" |
| title | CharField | |
| message | TextField | |
| is_read | BooleanField | |
| priority | CharField | low / medium / high / critical |
| metadata | JSONField | Additional data |
| action_url | CharField | Link to relevant page |
| created_at | DateTimeField | |

### ResumeEmailLog
**Table**: `resume_email_logs`  
**Primary Role**: Track bulk resume emails sent to companies.

| Field | Type | Notes |
|-------|------|-------|
| sent_by | ForeignKey | User (coordinator) |
| job | ForeignKey | Associated job |
| company_email | EmailField | Recipient company |
| subject | CharField | Email subject |
| body | TextField | Email body |
| cc_emails | JSONField | CC recipients |
| application_ids | JSONField | Resumes sent for which applications |
| student_names | JSONField | Student names included |
| resumes_attached | IntegerField | Count of resumes |
| skipped_students | JSONField | Students excluded from send |
| status | CharField | sent / failed / pending |
| error_message | TextField | If failed |
| sent_at | DateTimeField | |

---

## 4. INTERVIEWS APP (`backend/apps/interviews/models.py`)

### InterviewDomain
**Table**: `interview_domains`  
**Primary Role**: Top-level grouping of interview types.

Examples: "Digital Marketing", "Computer Science", "Business Analytics"

| Field | Type | Notes |
|-------|------|-------|
| name | CharField (unique) | |
| description | TextField | |
| icon | CharField | Emoji, etc. |
| is_active | BooleanField | |

### InterviewType
**Table**: `interview_types`  
**Primary Role**: Specific interview format within a domain.

Examples: "Marketing Strategy Interview", "Data Structures"

| Field | Type | Notes |
|-------|------|-------|
| domain | ForeignKey | Links to InterviewDomain |
| code | CharField (unique) | E.g., "MKTG_STRATEGY" |
| name | CharField | |
| description | TextField | |
| duration_minutes | IntegerField | |
| questions_per_session | IntegerField | |
| is_active | BooleanField | |

### Competency
**Table**: `interview_competencies`  
**Primary Role**: Skills/competencies required for an interview type.

| Field | Type | Notes |
|-------|------|-------|
| interview_type | ForeignKey | |
| name | CharField | E.g., "Python Proficiency" |
| description | TextField | |
| weight | FloatField | 0.1–2.0 (for weighted scoring) ✅ **KPI Field** |
| mastery_keywords | JSONField | List of mastery indicators |
| learning_resources | JSONField | Recommended resources |
| is_active | BooleanField | |
| **Unique Constraint**: (interview_type, name) |

### Question
**Table**: `interview_questions`  
**Primary Role**: Pre-made interview questions with AI evaluation.

| Field | Type | Notes |
|-------|------|-------|
| competency | ForeignKey | Links to Competency |
| text | TextField | Question text |
| **question_type** | CharField | short_answer / essay / coding / interview / scenario / behavioral ✅ **KPI Field** |
| **difficulty_level** | CharField | beginner / intermediate / advanced / expert ✅ **KPI Field** |
| ideal_answer | TextField | Reference answer |
| **evaluation_rubric** | JSONField | ✅ **KPI Field** — Dimension-based scoring criteria |
| | | `{ technical_accuracy: {weight, criteria[]}, depth: {...}, ... }` |
| difficulty_metadata | JSONField | Expected duration, follow-ups, etc. |
| max_score | IntegerField | Default: 100 |
| source | CharField | E.g., "internal" |
| is_active | BooleanField | |

### MockInterviewSession
**Table**: `mock_interview_sessions`  
**Primary Role**: Student interview session state.

| Field | Type | Notes |
|-------|------|-------|
| student | ForeignKey | Links to Student |
| interview_type | ForeignKey | Links to InterviewType |
| **status** | CharField | scheduled / in_progress / completed / abandoned / pending_review ✅ **KPI Field** |
| started_at | DateTimeField | ✅ **KPI Field** |
| completed_at | DateTimeField | ✅ **KPI Field** |
| questions | JSONField | Denormalized question list for this session |
| use_voice | BooleanField | Voice mode enabled |
| conversation_context | JSONField | Chat history |
| created_at | DateTimeField | |

### InterviewAnswer
**Table**: `interview_answers`  
**Primary Role**: Student answer with full AI evaluation.

| Field | Type | Notes |
|-------|------|-------|
| session | ForeignKey | Links to MockInterviewSession |
| question | ForeignKey | Links to Question |
| question_number | IntegerField | 1, 2, 3, ... |
| answer_text | TextField | Student's answer |
| **eval_status** | CharField | submitted / evaluating / evaluated / reviewed / failed ✅ **KPI Field** |
| **score** | FloatField | 0–100 (computed from evaluation_json) ✅ **KPI Field** |
| **evaluation_json** | JSONField | ✅ **KPI Field** — Full AI evaluation: |
| | | `{ overall_score, dimensions: {tech_accuracy, depth, ...}, strengths[], weaknesses[], confidence }` |
| ai_feedback | TextField | AI feedback summary |
| interviewer_reaction | TextField | Conversational reaction |
| **confidence_score** | FloatField | 0–1 (AI confidence in evaluation) ✅ **KPI Field** |
| **time_taken_seconds** | IntegerField | ✅ **KPI Field** |
| submitted_at | DateTimeField | |

### InterviewFeedback
**Table**: `interview_feedback`  
**Primary Role**: Aggregated session feedback.

| Field | Type | Notes |
|-------|------|-------|
| session | OneToOne | Links to MockInterviewSession |
| **total_score** | FloatField | Overall session score ✅ **KPI Field** |
| **competency_scores** | JSONField | ✅ **KPI Field** — `{competency_name: avg_score, ...}` |
| **dimension_averages** | JSONField | ✅ **KPI Field** — Per-dimension averages: |
| | | `{technical_accuracy: {avg, max}, depth: {...}, ...}` |
| **strengths** | JSONField | ✅ **KPI Field** — List of identified strengths |
| **weaknesses** | JSONField | ✅ **KPI Field** — List of identified weaknesses |
| feedback_summary | TextField | Narrative summary |
| generated_at | DateTimeField | When feedback was generated |

### SkillGapAnalysis
**Table**: `skill_gap_analyses`  
**Primary Role**: Gap analysis using profile data.

| Field | Type | Notes |
|-------|------|-------|
| student | ForeignKey | |
| domain | ForeignKey | Interview domain |
| current_skills | JSONField | Student's current skills per domain |
| skill_gaps | JSONField | List of identified gaps ✅ **KPI Field** |
| competency_gaps | JSONField | Gap per competency ✅ **KPI Field** |
| recommended_roadmap_template | ForeignKey | Suggested learning path |
| analysis_summary | TextField | |
| ai_generated | BooleanField | |
| analyzed_at | DateTimeField | |

### QuickRoadmap
**Table**: `quick_roadmaps`  
**Primary Role**: Lightweight learning roadmap.

| Field | Type | Notes |
|-------|------|-------|
| student | ForeignKey | |
| gap_analysis | OneToOne | Links to SkillGapAnalysis |
| template | ForeignKey | Links to RoadmapTemplate |
| milestones | JSONField | Learning milestones ✅ **KPI Field** |
| start_date | DateField | |
| target_completion_date | DateField | |
| total_hours | IntegerField | Estimated hours |
| is_active | BooleanField | |
| created_at | DateTimeField | |

### RoadmapTemplate
**Table**: `roadmap_templates`  
**Primary Role**: Pre-built learning path templates.

| Field | Type | Notes |
|-------|------|-------|
| domain | ForeignKey | Interview domain |
| name | CharField | E.g., "8-Week Intensive" |
| duration | CharField | 4_weeks / 8_weeks / 12_weeks |
| difficulty_level | CharField | beginner / intermediate / advanced / expert |
| milestones_structure | JSONField | Milestone definitions |
| total_hours | IntegerField | |
| description | TextField | |
| is_active | BooleanField | |

---

## 5. PROFILES APP (`backend/apps/profiles/models.py`)

### StudentProfile (OneToOne with Student)
**Table**: `student_profiles`  
**Primary Role**: Resume-specific profile data.

| Field | Type | Notes |
|-------|------|-------|
| student | OneToOne | Links to Student |
| phone | CharField | |
| location | CharField | |
| professional_summary | TextField | 2-3 sentences |
| linkedin | URLField | |
| github | URLField | |
| portfolio | URLField | |
| **completion_score** | FloatField | 0.0–1.0 (profile completeness) ✅ **KPI Field** |
| created_at | DateTimeField | |
| updated_at | DateTimeField | |

### Skill
**Table**: `student_skills`  
**Primary Role**: Student's skills.

| Field | Type | Notes |
|-------|------|-------|
| profile | ForeignKey | StudentProfile |
| **category** | CharField | Technical / Soft Skill / Language / Other ✅ **KPI Field** |
| name | CharField | Skill name |
| **proficiency** | CharField | Beginner / Intermediate / Advanced / Expert ✅ **KPI Field** |

### Experience
**Table**: `student_experiences`  
**Primary Role**: Work experience entries.

| Field | Type | Notes |
|-------|------|-------|
| profile | ForeignKey | |
| company | CharField | |
| position | CharField | |
| start_date | DateField | |
| end_date | DateField | |
| is_current | BooleanField | |
| description | TextField | |
| achievements | JSONField | Bullet points |

### Project
**Table**: `student_projects`  
**Primary Role**: Project portfolio.

| Field | Type | Notes |
|-------|------|-------|
| profile | ForeignKey | |
| title | CharField | |
| description | TextField | |
| technologies | JSONField | List of tech used |
| link | URLField | Project link |

---

## 6. RESUMES APP (`backend/apps/resumes/models.py`)

### BuiltResume
**Table**: `built_resumes`  
**Primary Role**: Individual built resume with multi-resume support.

| Field | Type | Notes |
|-------|------|-------|
| student | ForeignKey | Links to Student |
| title | CharField | E.g., "Tech ATS", "Product Manager" |
| description | TextField | Purpose of this version |
| **canonical_json** | JSONField | ✅ **KPI Field** — Source of truth for resume data |
| custom_html | TextField | Optional override HTML |
| template | ForeignKey | Resume template reference |
| state | CharField | draft / generated / error / ... |
| error_message | TextField | If state=error |
| is_primary | BooleanField | Default resume shown to employers |
| generated_pdf | FileField | Cached PDF output |
| **downloaded_count** | IntegerField | ✅ **KPI Field** — Tracking interest |
| generated_at | DateTimeField | |
| created_at | DateTimeField | |
| updated_at | DateTimeField | |

### ResumeUpload
**Table**: `resume_uploads`  
Uploaded PDF resumes with parsing status.

---

## 7. CAREER OS APP (`backend/apps/career_os/models.py`)

### Course
**Table**: `career_courses`

| Field | Type | Notes |
|-------|------|-------|
| name | CharField | |
| category | CharField | |

### Skill
**Table**: `career_skills`

| Field | Type | Notes |
|-------|------|-------|
| name | CharField (unique) | |
| category | CharField | |

### CourseSkill
**Table**: `career_course_skills`  
Maps courses to required skills.

| Field | Type | Notes |
|-------|------|-------|
| course | ForeignKey | |
| skill | ForeignKey | |
| **required_level** | IntegerField | 0–5 ✅ **KPI Field** |
| weight | DecimalField | Importance weight |

### LearningResource
**Table**: `career_learning_resources`

| Field | Type | Notes |
|-------|------|-------|
| skill | ForeignKey | |
| title | CharField | |
| platform | CharField | Coursera, Udemy, etc. |
| instructor | CharField | |
| estimated_hours | IntegerField | ✅ **KPI Field** |
| difficulty | CharField | |
| url | URLField | |

### CareerProfile (OneToOne with Student)
**Table**: `career_profiles`

| Field | Type | Notes |
|-------|------|-------|
| student | OneToOne | |
| course | ForeignKey | Career course |
| created_at | DateTimeField | |
| updated_at | DateTimeField | |

### StudentSkill
**Table**: `career_student_skills`  
Student's skill progress.

| Field | Type | Notes |
|-------|------|-------|
| profile | ForeignKey | CareerProfile |
| skill | ForeignKey | |
| **level** | IntegerField | 0–5 (current proficiency) ✅ **KPI Field** |
| added_at | DateTimeField | |

### Roadmap (OneToOne with CareerProfile)
**Table**: `career_roadmaps`

| Field | Type | Notes |
|-------|------|-------|
| profile | OneToOne | |
| status | CharField | active / completed / etc. |
| estimated_completion | DateTimeField | |
| created_at | DateTimeField | |

### RoadmapPhase
**Table**: `career_roadmap_phases`

| Field | Type | Notes |
|-------|------|-------|
| roadmap | ForeignKey | |
| phase_number | IntegerField | |
| name | CharField | |
| duration_weeks | IntegerField | |

### PhaseSkill
**Table**: `career_phase_skills`

| Field | Type | Notes |
|-------|------|-------|
| phase | ForeignKey | RoadmapPhase |
| skill | ForeignKey | |
| target_level | IntegerField | Goal proficiency |
| total_hours | IntegerField | Hours to invest |

---

## Key Summary: Fields Available for KPI Calculation

### 📊 Student Demographics
- `Student.cgpa` — CGPA (0–10)
- `Student.attendance` — Attendance (0–100%)
- `Student.backlogs` — Has backlogs (bool)
- `Student.category` — Category A/B/C
- `Student.year` — Academic year (1st–4th)
- `Student.course`, `Student.stream` — Course/Stream

### 💼 Job & Placement
- `Job.package` — Salary/package (decimal)
- `Job.location` — Location
- `Job.job_type` — Internal/External
- `Job.listing_type` — Job/Internship
- `Job.eligibility_rules` — Min CGPA, allowed branches, required skills, allowed years, no backlog
- `Placement.salary` — Legacy salary field

### 📋 Application Pipeline
- `Application.status` — applied / shortlisted / rejected / selected / accepted / withdrawn
- `ApplicationRound.status` — pending / scheduled / cleared / failed / skipped
- `ApplicationRound.score` — Round score (0–100)
- `Application.applied_at` — Application timestamp
- `ApplicationStatusHistory` — Full audit trail of status changes

### 🎤 Interview Performance
- `MockInterviewSession.status` — Scheduled / In Progress / Completed / Abandoned
- `MockInterviewSession.started_at`, `.completed_at` — Session timestamps
- `InterviewAnswer.score` — Answer score (0–100)
- `InterviewAnswer.evaluation_json` — Full evaluation with dimensions:
  - `overall_score`, `dimensions` (technical_accuracy, depth, communication, clarity, etc.)
  - `strengths[]`, `weaknesses[]`, `confidence`
- `InterviewAnswer.time_taken_seconds` — Time per question
- `InterviewAnswer.confidence_score` — AI confidence (0–1)
- `InterviewFeedback.total_score` — Session overall score
- `InterviewFeedback.competency_scores` — Per-competency averages
- `InterviewFeedback.dimension_averages` — Per-dimension stats
- `InterviewFeedback.strengths`, `.weaknesses` — Aggregated insights
- `Question.difficulty_level` — Beginner / Intermediate / Advanced / Expert
- `Question.question_type` — short_answer / essay / coding / interview / scenario / behavioral
- `Competency.weight` — Competency importance (0.1–2.0)

### 🛣️ Career Development
- `StudentProfile.completion_score` — Profile completeness (0–1)
- `Skill.proficiency` — Beginner / Intermediate / Advanced / Expert
- `StudentSkill.level` — Skill level (0–5)
- `SkillGapAnalysis.skill_gaps[]` — Identified gaps
- `SkillGapAnalysis.competency_gaps` — Gap per competency
- `QuickRoadmap.milestones` — Learning milestones
- `LearningResource.estimated_hours` — Learning time required

### 📄 Resume & Documents
- `BuiltResume.downloaded_count` — Resume downloads (interest metric)
- `BuiltResume.is_primary` — Primary resume flag
- `ResumeEmailLog.resumes_attached` — Bulk sends to companies

### 🔍 Audit & Tracking
- `AuditLog.action`, `.timestamp` — User action tracking
- `ExternalClickLog.timestamp` — When student clicked external job
- `ApplicationStatusHistory` — Change history with timestamps
- `ResumeEmailLog.status` — Email send status

---

## Relationships at a Glance

```
User
├── Student (OneToOne via user)
│   ├── StudentProfile (OneToOne via student)
│   │   ├── Skill[] (related_name: skills)
│   │   ├── Experience[] (related_name: experiences)
│   │   └── Project[] (related_name: projects)
│   ├── CareerProfile (OneToOne)
│   │   ├── StudentSkill[] (related_name: skills)
│   │   └── Roadmap (OneToOne via profile)
│   │       └── RoadmapPhase[]
│   ├── BuiltResume[] (related_name: built_resumes)
│   ├── Application[] (related_name: job_applications)
│   │   ├── ApplicationRound[] (related_name: rounds)
│   │   └── ApplicationStatusHistory[] (related_name: status_history)
│   ├── MockInterviewSession[] (related_name: interview_sessions)
│   │   ├── InterviewAnswer[] (related_name: answers)
│   │   └── InterviewFeedback (OneToOne via session)
│   ├── SkillGapAnalysis[] (related_name: gap_analyses)
│   └── QuickRoadmap[] (related_name: quick_roadmaps)
└── Placements[] (legacy, related_name: created_placements)

Job
├── JobRound[] (related_name: rounds)
├── Application[] (related_name: applications)
│   └── ApplicationRound (links to JobRound)
└── ResumeEmailLog[] (related_name: email_logs)

InterviewDomain
└── InterviewType[] (related_name: interview_types)
    ├── Competency[] (related_name: competencies)
    │   └── Question[] (related_name: questions)
    ├── MockInterviewSession[] (related_name: sessions)
    └── RoadmapTemplate[] (related_name: roadmap_templates)
```

---

## Notes for KPI Development

1. **Student Eligibility**: Use `Job.eligibility_rules` (JSON) to determine which students are eligible for each job.
2. **Application Tracking**: Full pipeline visible in `Application.status` + `ApplicationStatusHistory`.
3. **Interview Scoring**: Multi-dimensional scoring in `InterviewAnswer.evaluation_json` with competency breakdown in `InterviewFeedback`.
4. **Time Tracking**: Both `Application` and `InterviewAnswer` track timestamps for funnel analysis.
5. **Profile Completion**: `StudentProfile.completion_score` indicates resume/profile readiness.
6. **Skill Gaps**: `SkillGapAnalysis` and `QuickRoadmap` provide learning need assessment.
7. **Resume Interest**: `BuiltResume.downloaded_count` tracks employer interest.
8. **Email Sends**: `ResumeEmailLog` tracks bulk resume distributions to companies.
9. **Audit Trail**: `ApplicationStatusHistory` and `AuditLog` enable compliance reporting.
10. **Legacy Models**: `Placement` and `PlacementAssignment` are present but likely superseded by the modern Jobs + Applications models.
