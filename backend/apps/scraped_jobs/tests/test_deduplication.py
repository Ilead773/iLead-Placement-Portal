import pytest
from apps.scraped_jobs.deduplication import is_probable_duplicate, find_fuzzy_duplicate_in_memory

def test_is_probable_duplicate():
    # Exact match
    assert is_probable_duplicate("Software Engineer", "Google", "Software Engineer", "Google") is True
    
    # Slight variation in title (Software Engineer vs Software Engineer )
    assert is_probable_duplicate("Software Engineer", "Google", "Software Engineer ", "Google") is True
    
    # Slight variation in company (Google vs Google)
    assert is_probable_duplicate("Software Engineer", "Google", "Software Engineer", "Google ") is True
    
    # Completely different
    assert is_probable_duplicate("Software Engineer", "Google", "Chef", "Marriott") is False

def test_find_fuzzy_duplicate_in_memory():
    candidates = [
        (1, "Software Engineer", "Google", "hash1"),
        (2, "Data Scientist", "Meta", "hash2"),
    ]
    
    # Match found (Software Engineer vs Software Engineer )
    match = find_fuzzy_duplicate_in_memory("Software Engineer ", "Google", candidates)
    assert match is not None
    assert match[0] == 1
    
    # No match found
    match = find_fuzzy_duplicate_in_memory("Baker", "Cake Shop", candidates)
    assert match is None
