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

export const COURSE_STREAMS = {
  "BBA": ["School of Business"],
  "BBA in Digital Marketing (BBA DM)": ["School of Business"],
  "BBA in Travel & Tourism Management (BBA TTM)": ["School of Business"],
  "BBA in Entrepreneurship (BBA ENT)": ["School of Business"],
  "BBA in Sports Management (BBA SM)": ["School of Business"],
  "BBA in Hospital Management (BBA HM)": ["School of Business"],

  "BSc in Media Science (BMS)": ["School of Creativity"],
  "MSc in Media Science": ["School of Creativity"],
  "BSc in Multimedia, Animation, Graphic Design (BMAGD)": ["School of Creativity"],
  "MSc in Multimedia, Animation, Graphic Design (MMAGD)": ["School of Creativity"],
  "BSc in Film and Television Production (FTP)": ["School of Creativity"],
  "BSc in Interior Design": ["School of Creativity"],
  "BSc in Sustainable Fashion Design & Management": ["School of Creativity"],

  "Bachelor in Optometry": ["School of Sci & Tech"],
  "BSc in Critical Care Technology (CCT)": ["School of Sci & Tech"],
  "BSc in Medical Laboratory Technology (BMLT)": ["School of Sci & Tech"],
  "BSc in Data Science": ["School of Sci & Tech"],
  "BSc in Cyber Security": ["School of Sci & Tech"],
  "BSc in Computer Application (BCA)": ["School of Sci & Tech"]
};

/** All unique streams flat list */
export const ALL_STREAMS = [
  "School of Business",
  "School of Creativity",
  "School of Sci & Tech"
];

