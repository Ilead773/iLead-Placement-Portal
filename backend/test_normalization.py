from apps.scraped_jobs.course_config import normalize_course_name

test_cases = [
    "Bachelor of Business Administration (BBA)",
    "BBA in Sport Management (BBA SM)",
    "BBA in Sport Management",
    "BBA in Data Science",
    "BBA",
    "BBA in Digital Marketing (BBA DM)"
]

print("=== Normalization Tests ===")
for tc in test_cases:
    print(f"'{tc}' -> '{normalize_course_name(tc)}'")
