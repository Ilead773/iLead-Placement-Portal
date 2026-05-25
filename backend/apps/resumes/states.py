# apps/resumes/states.py
"""
Layer 10: Resume State Machine

Manages valid state transitions for the resume lifecycle.
Prevents invalid transitions (e.g., draft → active without processing).

States: DRAFT → PROCESSING → GENERATED → ACTIVE → ARCHIVED
                    ↓ (error)
                  FAILED → PROCESSING (retry)
Any → DELETED (soft delete)
"""

import logging

logger = logging.getLogger(__name__)


class ResumeState:
    """Resume lifecycle states as constants."""
    DRAFT = 'draft'
    PROCESSING = 'processing'
    GENERATED = 'generated'
    ACTIVE = 'active'
    ARCHIVED = 'archived'
    FAILED = 'failed'
    DELETED = 'deleted'

    CHOICES = [
        (DRAFT, 'Draft'),
        (PROCESSING, 'Processing'),
        (GENERATED, 'Generated'),
        (ACTIVE, 'Active'),
        (ARCHIVED, 'Archived'),
        (FAILED, 'Failed'),
        (DELETED, 'Deleted'),
    ]


# Valid transitions: source → [allowed destinations]
VALID_TRANSITIONS = {
    ResumeState.DRAFT: [ResumeState.PROCESSING, ResumeState.DELETED],
    ResumeState.PROCESSING: [ResumeState.GENERATED, ResumeState.FAILED, ResumeState.DELETED],
    ResumeState.GENERATED: [ResumeState.ACTIVE, ResumeState.ARCHIVED, ResumeState.DELETED],
    ResumeState.ACTIVE: [ResumeState.ARCHIVED, ResumeState.DELETED],
    ResumeState.ARCHIVED: [ResumeState.ACTIVE, ResumeState.DELETED],
    ResumeState.FAILED: [ResumeState.PROCESSING, ResumeState.DELETED],
    ResumeState.DELETED: [],  # Terminal state
}


class InvalidStateTransition(Exception):
    """Raised when an invalid state transition is attempted."""
    pass


class ResumeStateMachine:
    """
    Manages resume state transitions with validation.

    Usage:
        sm = ResumeStateMachine(resume)
        sm.transition_to(ResumeState.PROCESSING)
    """

    def __init__(self, resume):
        self.resume = resume

    @property
    def current_state(self):
        return self.resume.state

    def can_transition_to(self, new_state):
        """Check if a transition to the given state is valid."""
        allowed = VALID_TRANSITIONS.get(self.current_state, [])
        return new_state in allowed

    def transition_to(self, new_state, error_message=''):
        """
        Transition the resume to a new state.

        Raises InvalidStateTransition if the transition is not allowed.
        """
        if not self.can_transition_to(new_state):
            raise InvalidStateTransition(
                f"Cannot transition from '{self.current_state}' to '{new_state}'. "
                f"Allowed: {VALID_TRANSITIONS.get(self.current_state, [])}"
            )

        old_state = self.current_state
        self.resume.state = new_state

        if new_state == ResumeState.FAILED and error_message:
            self.resume.error_message = error_message

        self.resume.save(update_fields=['state', 'error_message', 'updated_at'])

        logger.info(
            f"Resume {self.resume.id}: {old_state} → {new_state}"
        )

    def start_processing(self):
        self.transition_to(ResumeState.PROCESSING)

    def mark_generated(self):
        self.transition_to(ResumeState.GENERATED)

    def mark_failed(self, error_message=''):
        self.transition_to(ResumeState.FAILED, error_message=error_message)

    def activate(self):
        self.transition_to(ResumeState.ACTIVE)

    def archive(self):
        self.transition_to(ResumeState.ARCHIVED)

    def retry(self):
        self.transition_to(ResumeState.PROCESSING)
