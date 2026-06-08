// src/api/interviews.js — Mock Interview API layer
import api from './axios';

const INTERVIEWS_BASE = '/interviews';

export const interviewsAPI = {
  // Domains & Types
  getDomains: () => api.get(`${INTERVIEWS_BASE}/domains/`),
  getInterviewTypes: (domainId) => {
    const params = domainId ? { domain_id: domainId } : {};
    return api.get(`${INTERVIEWS_BASE}/types/`, { params });
  },

  startInterview: (interviewTypeId, useVoice = true, numQuestions = null) => {
    const payload = {
      interview_type_id: interviewTypeId,
      use_voice: useVoice,
    };
    if (numQuestions) {
      payload.num_questions = numQuestions;
    }
    return api.post(`${INTERVIEWS_BASE}/start/`, payload);
  },

  submitAnswer: (sessionId, questionNumber, answerText, timeTaken = 0) =>
    api.post(`${INTERVIEWS_BASE}/submit-answer/`, {
      session_id: sessionId,
      question_number: questionNumber,
      answer_text: answerText,
      time_taken_seconds: timeTaken,
    }),

  checkAnswerStatus: (answerId) => api.get(`${INTERVIEWS_BASE}/check-answer-status/${answerId}/`),

  // Session History
  getSessions: () => api.get(`${INTERVIEWS_BASE}/sessions/`),
  getSessionDetail: (sessionId) => api.get(`${INTERVIEWS_BASE}/sessions/${sessionId}/`),
  abandonSession: (sessionId) => api.post(`${INTERVIEWS_BASE}/sessions/${sessionId}/abandon/`),

  // Gap Analysis
  runGapAnalysis: (domainId) =>
    api.post(`${INTERVIEWS_BASE}/gap-analysis/`, { domain_id: domainId }),
  getGapAnalyses: () => api.get(`${INTERVIEWS_BASE}/gap-analysis/list/`),
  createRoadmap: (analysisId) =>
    api.post(`${INTERVIEWS_BASE}/gap-analysis/${analysisId}/roadmap/`),

  // Roadmaps
  getRoadmaps: () => api.get(`${INTERVIEWS_BASE}/roadmaps/`),

  // Admin Stats
  getStats: () => api.get(`${INTERVIEWS_BASE}/stats/`),
};

export default interviewsAPI;
