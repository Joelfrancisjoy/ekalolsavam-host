"""
Business logic services for the recheck workflow.

This module contains the core business logic for managing recheck requests,
including lifecycle management, validation, and volunteer assignment.
"""

from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from typing import Optional, Tuple, List
import logging

from .models import RecheckRequest, Result
from users.models import User
from events.models import Event

logger = logging.getLogger(__name__)


class RecheckRequestService:
    """
    Service class for managing recheck request lifecycle and business logic.

    This service encapsulates all business rules related to recheck requests,
    including creation, validation, status transitions, and volunteer assignment.
    """

    @staticmethod
    def create_recheck_request(result: Result, participant: User, reason: str = "") -> RecheckRequest:
        """
        Create a new recheck request with proper validation.

        Args:
            result: The Result object being requested for re-check
            participant: The User (student) requesting the re-check
            reason: Optional reason for the re-check request (currently not stored)

        Returns:
            RecheckRequest: The created recheck request

        Raises:
            ValidationError: If validation fails
        """
        # Validate that the result belongs to the participant
        if result.participant != participant:
            raise ValidationError(
                "You can only request re-check for your own results.")

        # Enforce recheck rule: Recheck only allowed when event is in results_published status
        if result.event.status != "results_published":
            raise ValidationError(
                "Recheck not available")

        # Check if recheck is allowed (no existing request)
        if not result.is_recheck_allowed:
            # Check if there's already an accepted/completed recheck request
            existing_request = RecheckRequest.objects.filter(
                result=result,
                participant=participant
            ).first()
            if existing_request and existing_request.status in ["Accepted", "Completed"]:
                raise ValidationError(
                    "Re-check already processed for this result.")
            else:
                raise ValidationError(
                    "Re-check request already exists for this result.")

        # Find assigned volunteer for this event (required by model)
        assigned_volunteer = RecheckRequestService.get_assigned_volunteer(
            result.event)

        if not assigned_volunteer:
            raise ValueError(
                "No volunteer is assigned to this event. Cannot process re-check request.")

        # Create the recheck request with transaction safety
        with transaction.atomic():
            recheck_request = RecheckRequest.objects.create(
                result=result,
                participant=participant,
                assigned_volunteer=assigned_volunteer,
                status='Pending',
                reason=reason or ""
            )

            logger.info(
                f"Created recheck request {recheck_request.recheck_request_id} for result {result.id}")
            return recheck_request

    @staticmethod
    def get_assigned_volunteer(event: Event) -> Optional[User]:
        """
        Get the assigned volunteer for an event.

        Currently returns the first assigned volunteer. In a more sophisticated
        implementation, this could include load balancing or specific assignment logic.

        Args:
            event: The Event object

        Returns:
            User: The assigned volunteer, or None if no volunteer is assigned
        """
        return event.volunteers.first()

    @staticmethod
    def get_volunteer_recheck_requests(volunteer: User) -> List[RecheckRequest]:
        """
        Get all recheck requests that the volunteer can access.
        Now returns both pending and accepted requests so volunteers can track all requests they've handled.

        Args:
            volunteer: The volunteer User object

        Returns:
            List[RecheckRequest]: List of recheck requests (both pending and accepted)
        """
        return RecheckRequest.objects.filter(
            status__in=['Pending', 'Accepted']
        ).select_related('result', 'participant', 'result__event').order_by('-submitted_at')

    @staticmethod
    def get_recheck_request_for_volunteer(
        recheck_request_id: str,
        volunteer: User
    ) -> Optional[RecheckRequest]:
        """
        Get a specific recheck request that the volunteer can access.
        Volunteers can access both pending and accepted requests to track their work.

        Args:
            recheck_request_id: UUID of the recheck request
            volunteer: The volunteer User object

        Returns:
            RecheckRequest: The request if found and accessible, None otherwise
        """
        try:
            return RecheckRequest.objects.select_related(
                'result', 'participant', 'result__event'
            ).get(
                recheck_request_id=recheck_request_id,
                # Allow access to both pending and accepted requests
                status__in=['Pending', 'Accepted']
            )
        except RecheckRequest.DoesNotExist:
            return None

    @staticmethod
    def accept_recheck_request(
        recheck_request_id: str,
        volunteer: User
    ) -> Tuple[bool, str, Optional[RecheckRequest]]:
        """
        Accept a recheck request and update its status.

        Args:
            recheck_request_id: UUID of the recheck request
            volunteer: The volunteer User object accepting the request

        Returns:
            Tuple[bool, str, Optional[RecheckRequest]]: 
                (success, message, updated_request)
        """
        try:
            # Get the recheck request (any volunteer can accept pending requests)
            try:
                recheck_request = RecheckRequest.objects.select_related(
                    'result', 'participant', 'result__event'
                ).get(
                    recheck_request_id=recheck_request_id,
                    status='Pending'  # Only allow accepting pending requests
                )
            except RecheckRequest.DoesNotExist:
                return False, "Re-check request not found or already processed", None

            # Validate status transition
            if not RecheckRequestService.is_valid_status_transition(
                recheck_request.status, 'Accepted'
            ):
                return False, f"Cannot accept request with status '{recheck_request.status}'", None

            # Update the request status with transaction safety
            # Also update the assigned volunteer to who actually accepted it
            with transaction.atomic():
                recheck_request.status = 'Accepted'
                recheck_request.accepted_at = timezone.now()
                # Update the assigned volunteer to the one who accepted (for record keeping)
                # Always update to who actually accepted
                recheck_request.assigned_volunteer = volunteer
                recheck_request.save()

                logger.info(
                    f"Accepted recheck request {recheck_request_id} by volunteer {volunteer.id}")

                return True, "Re-check request accepted successfully", recheck_request

        except Exception as e:
            logger.error(
                f"Error accepting recheck request {recheck_request_id}: {e}")
            return False, "An error occurred while accepting the re-check request", None

    @staticmethod
    def is_valid_status_transition(current_status: str, new_status: str) -> bool:
        """
        Validate if a status transition is allowed.

        Allowed transitions:
        - Pending → Accepted (when volunteer accepts)
        - Accepted → Completed (when recheck is processed)

        Args:
            current_status: Current status of the request
            new_status: Desired new status

        Returns:
            bool: True if transition is valid, False otherwise
        """
        valid_transitions = {
            'Pending': ['Accepted'],
            'Accepted': ['Completed'],  # Allow transition to completed
            'Completed': []  # No further transitions after completion
        }

        return new_status in valid_transitions.get(current_status, [])

    @staticmethod
    def validate_recheck_request_data(recheck_request: RecheckRequest) -> Tuple[bool, List[str]]:
        """
        Validate all data fields of a recheck request.

        Args:
            recheck_request: The RecheckRequest object to validate

        Returns:
            Tuple[bool, List[str]]: (is_valid, list_of_errors)
        """
        errors = []

        # Validate required fields
        if not recheck_request.full_name:
            errors.append("Full name is required")

        if not recheck_request.category:
            errors.append("Category is required")

        if not recheck_request.event_name:
            errors.append("Event name is required")

        if not recheck_request.chest_number:
            errors.append("Chest number is required")

        if recheck_request.final_score is None:
            errors.append("Final score is required")

        if not recheck_request.assigned_volunteer:
            errors.append("Assigned volunteer is required")

        # Validate status
        if recheck_request.status not in ['Pending', 'Accepted']:
            errors.append("Invalid status")

        # Validate relationships
        if not recheck_request.result:
            errors.append("Result reference is required")

        if not recheck_request.participant:
            errors.append("Participant reference is required")

        # Validate data consistency
        if recheck_request.result and recheck_request.participant:
            if recheck_request.result.participant != recheck_request.participant:
                errors.append("Result participant mismatch")

        # Validate timestamp logic
        if recheck_request.status == 'Accepted' and not recheck_request.accepted_at:
            errors.append("Accepted requests must have acceptance timestamp")

        if recheck_request.status == 'Pending' and recheck_request.accepted_at:
            errors.append(
                "Pending requests should not have acceptance timestamp")

        return len(errors) == 0, errors

    @staticmethod
    def get_completion_confirmation(recheck_request: RecheckRequest) -> dict:
        """
        Generate completion confirmation data for an accepted recheck request.

        Args:
            recheck_request: The RecheckRequest object

        Returns:
            dict: Completion confirmation data
        """
        if recheck_request.status not in ['Accepted', 'Completed']:
            return {
                'is_completed': False,
                'message': 'Request is not yet accepted',
                'status': recheck_request.status
            }

        return {
            'is_completed': recheck_request.status == 'Completed',
            'message': 'Re-evaluation has been completed successfully' if recheck_request.status == 'Completed' else 'Re-evaluation has been accepted and is pending completion',
            'status': recheck_request.status,
            'accepted_at': recheck_request.accepted_at.isoformat() if recheck_request.accepted_at else None,
            'accepted_by': recheck_request.assigned_volunteer.username,
            'participant': recheck_request.full_name,
            'event': recheck_request.event_name,
            'original_score': float(recheck_request.final_score)
        }

    @staticmethod
    def complete_recheck_request(
        recheck_request_id: str,
        completed_by: User
    ) -> Tuple[bool, str, Optional[RecheckRequest]]:
        """
        Mark a recheck request as completed.

        Args:
            recheck_request_id: UUID of the recheck request
            completed_by: The user completing the request (typically the volunteer)

        Returns:
            Tuple[bool, str, Optional[RecheckRequest]]: 
                (success, message, updated_request)
        """
        try:
            # Get the recheck request
            try:
                recheck_request = RecheckRequest.objects.select_related(
                    'result', 'participant', 'result__event'
                ).get(
                    recheck_request_id=recheck_request_id,
                    status='Accepted'  # Only allow completing accepted requests
                )
            except RecheckRequest.DoesNotExist:
                return False, "Re-check request not found or already completed", None

            # Validate status transition
            if not RecheckRequestService.is_valid_status_transition(
                recheck_request.status, 'Completed'
            ):
                return False, f"Cannot complete request with status '{recheck_request.status}'", None

            # Update the request status with transaction safety
            with transaction.atomic():
                recheck_request.status = 'Completed'
                recheck_request.save()

                logger.info(
                    f"Completed recheck request {recheck_request_id} by user {completed_by.id}")

                return True, "Re-check request completed successfully", recheck_request

        except Exception as e:
            logger.error(
                f"Error completing recheck request {recheck_request_id}: {e}")
            return False, "An error occurred while completing the re-check request", None


class VolunteerAssignmentService:
    """
    Service class for managing volunteer assignments and lookups.

    This service handles the logic for determining which volunteers
    are assigned to which events and can process recheck requests.
    """

    @staticmethod
    def get_events_for_volunteer(volunteer: User) -> List[Event]:
        """
        Get all events assigned to a specific volunteer.

        Args:
            volunteer: The volunteer User object

        Returns:
            List[Event]: List of assigned events
        """
        return list(volunteer.assigned_volunteer_events.all())

    @staticmethod
    def is_volunteer_assigned_to_event(volunteer: User, event: Event) -> bool:
        """
        Check if a volunteer is assigned to a specific event.

        Args:
            volunteer: The volunteer User object
            event: The Event object

        Returns:
            bool: True if volunteer is assigned to event, False otherwise
        """
        return event.volunteers.filter(id=volunteer.id).exists()

    @staticmethod
    def get_volunteers_for_event(event: Event) -> List[User]:
        """
        Get all volunteers assigned to a specific event.

        Args:
            event: The Event object

        Returns:
            List[User]: List of assigned volunteers
        """
        return list(event.volunteers.all())

    @staticmethod
    def validate_volunteer_assignment(volunteer: User, recheck_request: RecheckRequest) -> bool:
        """
        Validate that a volunteer is properly assigned to handle a recheck request.

        Args:
            volunteer: The volunteer User object
            recheck_request: The RecheckRequest object

        Returns:
            bool: True if volunteer can handle the request, False otherwise
        """
        # Check if volunteer is assigned to the event
        event = recheck_request.result.event
        return VolunteerAssignmentService.is_volunteer_assigned_to_event(volunteer, event)
