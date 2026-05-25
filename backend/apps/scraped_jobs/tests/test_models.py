import pytest
from apps.scraped_jobs.models import ScrapedJob, CourseJobMapping
from django.db.utils import IntegrityError

@pytest.mark.django_db
def test_scraped_job_unique_hash():
    ScrapedJob.objects.create(
        external_job_id='job1', source='test', title='Job 1',
        company_name='Co', dedup_hash='unique_hash', is_active=True
    )
    
    with pytest.raises(IntegrityError):
        ScrapedJob.objects.create(
            external_job_id='job2', source='test', title='Job 2',
            company_name='Co', dedup_hash='unique_hash', is_active=True
        )

@pytest.mark.django_db
def test_course_job_mapping_uniqueness():
    job = ScrapedJob.objects.create(
        external_job_id='job3', source='test', title='Job 3',
        company_name='Co', dedup_hash='hash3', is_active=True
    )
    CourseJobMapping.objects.create(course_name='BSc in Data Science', scraped_job=job)
    
    # Should fail due to unique_together constraint if it exists
    with pytest.raises(IntegrityError):
        CourseJobMapping.objects.create(course_name='BSc in Data Science', scraped_job=job)
