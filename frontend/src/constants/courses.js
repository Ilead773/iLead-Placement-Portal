/**
 * SINGLE SOURCE OF TRUTH for all iLEAD course names.
 *
 * These must exactly match the keys in:
 *   backend/apps/scraped_jobs/course_config.py → COURSE_SEARCH_CONFIG
 *
 * DO NOT duplicate or abbreviate course names anywhere else in the frontend.
 * Import this array wherever a course list is needed.
 */

export const ILEAD_COURSES = [
  // ── Business & Management ──────────────────────────────────────
  "BBA",
  "BBA (Finance)",
  "BBA in Digital Marketing (BBA DM)",
  "BBA in Travel & Tourism Management (BBA TTM)",
  "BBA in Entrepreneurship (BBA ENT)",
  "BBA in Sports Management (BBA SM)",
  "BBA in Hospital Management (BBA HM)",

  // ── Design & Media ─────────────────────────────────────────────
  "BSc in Media Science (BMS)",
  "MSc in Media Science",
  "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
  "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
  "BSc in Film and Television Production (FTP)",
  "BSc in Interior Design",
  "BSc in Sustainable Fashion Design & Management",

  // ── Health Sciences ────────────────────────────────────────────
  "Bachelor in Optometry",
  "BSc in Critical Care Technology (CCT)",
  "BSc in Medical Laboratory Technology (BMLT)",

  // ── Technology ─────────────────────────────────────────────────
  "BSc in Data Science",
  "BSc in Cyber Security",
  "BSc in Computer Application (BCA)",
];

/** Department grouping — mirrors COURSE_TO_DEPARTMENT_MAP in course_config.py */
export const COURSE_DEPARTMENTS = {
  "Business & Management": [
    "BBA",
    "BBA (Finance)",
    "BBA in Digital Marketing (BBA DM)",
    "BBA in Travel & Tourism Management (BBA TTM)",
    "BBA in Entrepreneurship (BBA ENT)",
    "BBA in Sports Management (BBA SM)",
    "BBA in Hospital Management (BBA HM)",
  ],
  "Design & Media": [
    "BSc in Media Science (BMS)",
    "MSc in Media Science",
    "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
    "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
    "BSc in Film and Television Production (FTP)",
    "BSc in Interior Design",
    "BSc in Sustainable Fashion Design & Management",
  ],
  "Health Sciences": [
    "Bachelor in Optometry",
    "BSc in Critical Care Technology (CCT)",
    "BSc in Medical Laboratory Technology (BMLT)",
  ],
  Technology: [
    "BSc in Data Science",
    "BSc in Cyber Security",
    "BSc in Computer Application (BCA)",
  ],
};

/** Convenience: returns courses as { name } objects (for components that expect that shape) */
export const ILEAD_COURSES_OBJ = ILEAD_COURSES.map((name) => ({ name }));
