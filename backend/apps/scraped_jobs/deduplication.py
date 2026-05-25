# apps/scraped_jobs/deduplication.py
"""
Two-stage deduplication.
Stage 1: Bulk hash preload — one DB query, O(1) lookup per job.
Stage 2: In-memory fuzzy matching using rapidfuzz — NO per-job DB queries.
  Candidate pool is loaded ONCE per _save_jobs() call, held in memory.
"""

import logging
from rapidfuzz import fuzz
from apps.scraped_jobs.models import ScrapedJob

logger = logging.getLogger(__name__)

TITLE_FUZZY_THRESHOLD = 92
COMPANY_FUZZY_THRESHOLD = 90


def is_probable_duplicate(title1, company1, title2, company2):
    title_score = fuzz.token_sort_ratio(title1, title2)
    company_score = fuzz.ratio(company1, company2)
    return title_score > TITLE_FUZZY_THRESHOLD and company_score > COMPANY_FUZZY_THRESHOLD


def preload_existing_hashes(incoming_jobs):
    """
    Bulk-loads all matching dedup_hashes from DB in one query.
    Returns set of hashes that already exist.
    """
    hashes = [j.get('dedup_hash') for j in incoming_jobs if j.get('dedup_hash')]
    if not hashes:
        return set()
    return set(
        ScrapedJob.objects.filter(dedup_hash__in=hashes)
        .values_list('dedup_hash', flat=True)
    )


def load_fuzzy_candidates(company_names):
    """
    Loads recent jobs that share any part of a company name — in ONE DB query.
    Returns list of (id, title, company_name, dedup_hash) tuples held in memory.
    Called ONCE per _save_jobs() batch, not once per job.
    """
    if not company_names:
        return []
    from django.db.models import Q
    from datetime import datetime, timezone, timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    q = Q()
    for name in set(company_names):
        short_name = name[:20].strip()
        if short_name:
            q |= Q(company_name__icontains=short_name)

    return list(
        ScrapedJob.objects.filter(q, scraped_at__gte=cutoff)
        .only('id', 'title', 'company_name', 'dedup_hash')
        .values_list('id', 'title', 'company_name', 'dedup_hash')
    )


def find_fuzzy_duplicate_in_memory(title, company, candidates):
    """
    Checks in-memory candidate list for a fuzzy match.
    No DB queries. candidates is a list of (id, title, company_name, dedup_hash) tuples.
    Returns matching tuple or None.
    """
    for (job_id, cand_title, cand_company, cand_hash) in candidates:
        if is_probable_duplicate(title, company, cand_title, cand_company):
            return (job_id, cand_title, cand_company, cand_hash)
    return None
