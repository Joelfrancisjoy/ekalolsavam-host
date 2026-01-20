from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import Score, Result, RecheckRequest, RazorpayPayment
from .serializers import ScoreSerializer, ResultSerializer, RecheckRequestCreateSerializer, RecheckRequestSerializer
from django.db.models import Avg, Count, Q
from .scoring_criteria import get_criteria_for_event, validate_score_data
from events.models import Event
from django.shortcuts import get_object_or_404
from .ml_models.anomaly_detector import get_anomaly_detector
from .services import RecheckRequestService, VolunteerAssignmentService
from django.db.models import Sum
import logging
from decimal import Decimal
import razorpay
from django.conf import settings

logger = logging.getLogger(__name__)


class ScoreListCreateView(generics.ListCreateAPIView):
    serializer_class = ScoreSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Score.objects.all()
        elif user.role == 'judge':
            return Score.objects.filter(judge=user)
        else:
            return Score.objects.filter(participant=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'judge':
            # Enforce scoring rule: Scoring only allowed when event is in progress
            event = serializer.validated_data['event']
            if event.status != "in_progress":
                from django.core.exceptions import ValidationError
                raise ValidationError("Scoring not open")

            serializer.save(judge=user)
        else:
            raise PermissionError("Only judges can submit scores")


class ResultListView(generics.ListAPIView):
    serializer_class = ResultSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        event_id = self.request.query_params.get('event', None)
        queryset = Result.objects.filter(published=True)

        user = self.request.user
        if getattr(user, 'role', None) == 'student':
            queryset = queryset.filter(participant=user)

        if event_id:
            queryset = queryset.filter(event_id=event_id)
        return queryset


class JudgeResultsView(generics.ListAPIView):
    serializer_class = ResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'judge':
            # Get results for events assigned to this judge
            return Result.objects.filter(
                event__judges=user,
                published=True
            )
        return Result.objects.none()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_scores_bundle(request):
    """
    Accepts a score submission from a judge for a participant in an event.
    Supports both legacy format and new dynamic criteria format.

    New format payload:
    {
      "eventId": <event_id>,
      "participantId": <user_id>,
      "items": [
        {"criteria": "Technical Skill", "score": 20.5, "comments": ""},
        {"criteria": "Artistic Expression", "score": 18.0, "comments": ""},
        ...
      ]
    }

    Legacy format still supported for backward compatibility.
    """
    user = request.user
    if getattr(user, 'role', None) != 'judge':
        return Response({"error": "Only judges can submit scores"}, status=status.HTTP_403_FORBIDDEN)

    # Check if new format (with items array)
    if 'items' in request.data:
        return _submit_dynamic_scores(request, user)
    else:
        return _submit_legacy_scores(request, user)


def _submit_dynamic_scores(request, user):
    """Handle new dynamic criteria format."""
    event_id = request.data.get('eventId')
    participant_id = request.data.get('participantId')
    items = request.data.get('items', [])

    if not event_id or not participant_id or not items:
        return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        event = get_object_or_404(Event, pk=event_id)

        # Enforce scoring rule: Scoring only allowed when event is in progress
        if event.status != "in_progress":
            return Response({"error": "Scoring not open"}, status=status.HTTP_400_BAD_REQUEST)

        # Get expected criteria for this event
        expected_criteria = get_criteria_for_event(event.name, event.category)

        # Build criteria_scores dict from items
        criteria_scores = {}
        notes_parts = []

        for item in items:
            criteria_label = item.get('criteria', '')
            score = item.get('score', 0)
            comments = item.get('comments', '')

            # Find matching criterion ID
            criterion_id = None
            for c in expected_criteria:
                if c['label'] == criteria_label:
                    criterion_id = c['id']
                    break

            if criterion_id:
                criteria_scores[criterion_id] = float(score)
                if comments:
                    notes_parts.append(f"{criteria_label}: {comments}")

        notes = "\n".join(notes_parts) if notes_parts else ""

        # Prepare score data for anomaly detection
        score_data = {
            'technical_skill': criteria_scores.get('technical_skill', 0),
            'artistic_expression': criteria_scores.get('artistic_expression', 0),
            'stage_presence': criteria_scores.get('stage_presence', 0),
            'overall_impression': criteria_scores.get('overall_impression', 0),
            'total_score': sum(float(v) for v in criteria_scores.values() if v is not None)
        }

        # Anomaly detection
        is_anomaly, confidence, details = _check_anomaly(score_data)

        with transaction.atomic():
            obj, created = Score.objects.update_or_create(
                event_id=event_id,
                participant_id=participant_id,
                judge=user,
                defaults={
                    'criteria_scores': criteria_scores,
                    'notes': notes,
                    'is_flagged': is_anomaly,
                    'anomaly_confidence': confidence if is_anomaly else None,
                    'anomaly_details': details if is_anomaly else {},
                }
            )

            serializer = ScoreSerializer(obj)
            response_data = {
                "status": "ok",
                "created": created,
                "score": serializer.data
            }

            # Add anomaly warning if detected
            if is_anomaly:
                response_data["anomaly_detected"] = True
                response_data["anomaly_confidence"] = round(confidence, 3)
                response_data["anomaly_severity"] = details.get(
                    'severity', 'unknown')
                response_data["message"] = "Score flagged for admin review due to potential anomaly"

            return Response(response_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


def _submit_legacy_scores(request, user):
    """Handle legacy format for backward compatibility."""
    event_id = request.data.get('event')
    participant_id = request.data.get('participant')
    technical_skill = request.data.get('technical_skill')
    artistic_expression = request.data.get('artistic_expression')
    stage_presence = request.data.get('stage_presence')
    overall_impression = request.data.get('overall_impression')
    notes = request.data.get('notes', '')

    if not all([event_id, participant_id, technical_skill is not None,
                artistic_expression is not None, stage_presence is not None,
                overall_impression is not None]):
        return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        event = get_object_or_404(Event, pk=event_id)

        # Enforce scoring rule: Scoring only allowed when event is in progress
        if event.status != "in_progress":
            return Response({"error": "Scoring not open"}, status=status.HTTP_400_BAD_REQUEST)

        # Prepare score data for anomaly detection
        score_data = {
            'technical_skill': float(technical_skill),
            'artistic_expression': float(artistic_expression),
            'stage_presence': float(stage_presence),
            'overall_impression': float(overall_impression),
            'total_score': float(technical_skill) + float(artistic_expression) + float(stage_presence) + float(overall_impression)
        }

        # Anomaly detection
        is_anomaly, confidence, details = _check_anomaly(score_data)

        with transaction.atomic():
            obj, created = Score.objects.update_or_create(
                event_id=event_id,
                participant_id=participant_id,
                judge=user,
                defaults={
                    'technical_skill': technical_skill,
                    'artistic_expression': artistic_expression,
                    'stage_presence': stage_presence,
                    'overall_impression': overall_impression,
                    'notes': notes,
                    'is_flagged': is_anomaly,
                    'anomaly_confidence': confidence if is_anomaly else None,
                    'anomaly_details': details if is_anomaly else {},
                }
            )

            serializer = ScoreSerializer(obj)
            response_data = {
                "status": "ok",
                "created": created,
                "score": serializer.data
            }

            # Add anomaly warning if detected
            if is_anomaly:
                response_data["anomaly_detected"] = True
                response_data["anomaly_confidence"] = round(confidence, 3)
                response_data["anomaly_severity"] = details.get(
                    'severity', 'unknown')
                response_data["message"] = "Score flagged for admin review due to potential anomaly"

            return Response(response_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scores_summary(request):
    """
    Returns per-participant per-event summary for the requesting judge, including:
    - my_scores_total: my total score for that participant in that event
    - judges_submitted: number of distinct judges who have submitted scores for that participant
    - judges_totals: list of total scores per judge
    - current_final: current final score after dropping extremes (if 5+ judges)
    Query params: event=<id>
    """
    user = request.user
    if getattr(user, 'role', None) != 'judge':
        return Response({"error": "Only judges can view this summary"}, status=status.HTTP_403_FORBIDDEN)

    event_id = request.query_params.get('event')
    if not event_id:
        return Response({"error": "Missing event id"}, status=status.HTTP_400_BAD_REQUEST)

    # Get all scores for this event
    scores = Score.objects.filter(
        event_id=event_id).select_related('participant', 'judge')

    # Build participant -> list of judge totals
    participant_to_judges = {}
    participant_to_mine = {}

    for score in scores:
        pid = score.participant_id
        jid = score.judge_id
        tot = float(score.total_score)

        if pid not in participant_to_judges:
            participant_to_judges[pid] = []
        participant_to_judges[pid].append({"judge": jid, "total": tot})

        if jid == user.id:
            participant_to_mine[pid] = tot

    # Prepare response array
    data = []
    for pid, judges in participant_to_judges.items():
        judges_totals = [j['total'] for j in judges]

        # Calculate current final score (drop highest and lowest if 5+ judges)
        current_final = None
        if len(judges_totals) >= 5:
            sorted_totals = sorted(judges_totals)
            # Drop highest and lowest
            dropped_totals = sorted_totals[1:-1]
            current_final = sum(dropped_totals) / \
                len(dropped_totals) if dropped_totals else None
        elif judges_totals:
            current_final = sum(judges_totals) / len(judges_totals)

        data.append({
            'participant': pid,
            'my_scores_total': participant_to_mine.get(pid),
            'judges_submitted': len(judges_totals),
            'judges_totals': judges_totals,
            'current_final': current_final,
        })

    return Response({'results': data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_event_criteria(request):
    """
    Get scoring criteria for a specific event.
    Query params: event=<id>
    """
    event_id = request.query_params.get('event')
    if not event_id:
        return Response({"error": "Missing event id"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        event = get_object_or_404(Event, pk=event_id)
        criteria = get_criteria_for_event(event.name, event.category)

        return Response({
            'event_id': event.id,
            'event_name': event.name,
            'category': event.category,
            'criteria': criteria
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_scores(request):
    """
    Get scores and feedback for the authenticated student.
    Returns scores with judge feedback for all events the student participated in.
    """
    user = request.user

    # Verify user is a student
    if getattr(user, 'role', None) != 'student':
        return Response(
            {'error': 'Only students can access their scores'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        # Get all scores for this student
        # Use select_related to optimize database queries
        scores = Score.objects.filter(participant=user).select_related(
            'event', 'judge'
        ).order_by('-submitted_at')

        # Build response with feedback
        results = []
        for score in scores:
            # Safely handle potential None values for judge
            try:
                if score.judge:
                    judge_data = {
                        'id': score.judge.id,
                        'name': score.judge.username
                    }
                else:
                    judge_data = {
                        'id': None,
                        'name': 'Unknown Judge'
                    }
            except AttributeError:
                # Handle case where judge relation failed to load
                judge_data = {
                    'id': None,
                    'name': 'Unknown Judge'
                }

            # Safely convert scores to float, handling null values
            results.append({
                'id': score.id,
                'event': {
                    'id': score.event.id,
                    'name': score.event.name,
                    'category': score.event.category,
                    'date': score.event.date.isoformat() if score.event.date else None
                },
                'judge': judge_data,
                'total_score': float(score.total_score) if score.total_score is not None else 0.0,
                'feedback': score.notes or '',
                'submitted_at': score.submitted_at.isoformat() if score.submitted_at else None,
                'scores': {
                    'technical_skill': float(score.technical_skill) if score.technical_skill is not None else None,
                    'artistic_expression': float(score.artistic_expression) if score.artistic_expression is not None else None,
                    'stage_presence': float(score.stage_presence) if score.stage_presence is not None else None,
                    'overall_impression': float(score.overall_impression) if score.overall_impression is not None else None,
                },
                'criteria_scores': score.criteria_scores if score.criteria_scores else {}
            })

        return Response({
            'count': len(results),
            'scores': results
        })
    except Exception as e:
        logger.error(f'Error fetching student scores: {e}')
        logger.exception(e)  # Log full exception trace
        return Response(
            {'error': 'Failed to load your scores and feedback'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Helper function for anomaly detection
def _check_anomaly(score_data):
    """
    Check if a score is anomalous using the trained ML model.

    Args:
        score_data: Dict with score values

    Returns:
        Tuple of (is_anomaly, confidence, details)
    """
    try:
        detector = get_anomaly_detector()
        is_anomaly, confidence, details = detector.detect_anomaly(score_data)
        logger.info(
            f"Anomaly check: is_anomaly={is_anomaly}, confidence={confidence:.3f}")
        return is_anomaly, confidence, details
    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        # Return safe defaults on error
        return False, 0.0, {'method': 'error', 'error': str(e)}


# Student-side recheck workflow endpoints

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_result_details(request, result_id):
    """
    GET /api/student/results/{resultId}
    Fetch result details with re-check eligibility for students.

    Returns result data including:
    - All participant information (full name, category, event name, chest number, final score)
    - isRecheckAllowed flag indicating if re-check can be requested
    """
    user = request.user

    # Ensure only students can access this endpoint
    if getattr(user, 'role', None) != 'student':
        return Response(
            {"error": "Only students can access result details"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        # Get the result and ensure it belongs to the requesting student
        result = Result.objects.get(id=result_id, participant=user)

        # Serialize the result with all required fields
        serializer = ResultSerializer(result, context={'request': request})

        return Response(serializer.data, status=status.HTTP_200_OK)

    except Result.DoesNotExist:
        return Response(
            {"error": "Result not found or you don't have permission to view it"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error fetching result details: {e}")
        return Response(
            {"error": "An error occurred while fetching result details"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_recheck_request_details(request, recheck_request_id):
    """Student-only endpoint to view accepted recheck request details (including payment info)."""
    user = request.user
    if getattr(user, 'role', None) != 'student':
        return Response({"error": "Only students can access re-check request details"}, status=status.HTTP_403_FORBIDDEN)

    try:
        recheck_request = get_object_or_404(
            RecheckRequest, recheck_request_id=recheck_request_id, participant=user)
        if recheck_request.status != 'Accepted':
            return Response({"error": "Re-check request is not accepted yet"}, status=status.HTTP_400_BAD_REQUEST)

        event = getattr(recheck_request.result, 'event', None)

        # Default registration amount set to ₹100
        registration_amount = Decimal('100.00')
        amount_paid = Decimal('0.00')
        registration_status = None
        chess_number = None
        try:
            from events.models import EventRegistration
            reg = EventRegistration.objects.filter(
                event=event, participant=user).first()
            if reg:
                # Use the registration amount from the database if available, otherwise default to ₹100
                registration_amount = getattr(
                    reg, 'registration_amount', Decimal('100.00')) or Decimal('100.00')
                amount_paid = getattr(reg, 'amount_paid',
                                      Decimal('0.00')) or Decimal('0.00')
                registration_status = getattr(reg, 'status', None)
                chess_number = getattr(reg, 'chess_number', None)
        except Exception:
            registration_amount = Decimal('100.00')
            amount_paid = Decimal('0.00')
            registration_status = None
            chess_number = None

        # For recheck requests, we need to calculate recheck-specific payment status
        # The registration amount is for the event, but recheck requests may have their own fee
        recheck_fee = Decimal('100.00')

        # Check if there are any Razorpay payments for this recheck request
        existing_payments = RazorpayPayment.objects.filter(
            recheck_request=recheck_request,
            status='captured'
        ).aggregate(total_paid=Sum('amount'))['total_paid'] or Decimal('0.00')

        # Calculate outstanding recheck fee
        outstanding_recheck = recheck_fee - existing_payments

        # Calculate event registration outstanding separately
        outstanding_registration = registration_amount - amount_paid
        if outstanding_registration < 0:
            outstanding_registration = Decimal('0.00')

        participant_details = {}
        try:
            from users.serializers import UserSerializer
            participant_details = UserSerializer(user).data
        except Exception:
            participant_details = {
                'id': user.id,
                'username': getattr(user, 'username', ''),
                'first_name': getattr(user, 'first_name', ''),
                'last_name': getattr(user, 'last_name', ''),
                'email': getattr(user, 'email', ''),
            }

        data = {
            'recheck_request': {
                'recheck_request_id': str(recheck_request.recheck_request_id),
                'status': recheck_request.status,
                'submitted_at': recheck_request.submitted_at,
                'accepted_at': recheck_request.accepted_at,
                'reason': recheck_request.reason or '',
            },
            'event': {
                'id': event.id if event else None,
                'name': getattr(event, 'name', None) if event else None,
                'category': getattr(event, 'category', None) if event else None,
                'date': getattr(event, 'date', None) if event else None,
                'start_time': getattr(event, 'start_time', None) if event else None,
                'end_time': getattr(event, 'end_time', None) if event else None,
                'venue': {
                    'id': getattr(getattr(event, 'venue', None), 'id', None) if event else None,
                    'name': getattr(getattr(event, 'venue', None), 'name', None) if event else None,
                },
            },
            'result': {
                'id': recheck_request.result.id,
                'total_score': recheck_request.result.total_score,
                'rank': recheck_request.result.rank,
                'published': recheck_request.result.published,
            },
            'student': participant_details,
            'registration': {
                'status': registration_status,
                'chess_number': chess_number,
                'registration_amount': str(registration_amount),
                'amount_paid': str(amount_paid),
                'outstanding': str(outstanding_registration),
                'payment_required': outstanding_registration > 0,
            },
            'recheck_payment': {
                'fee': str(recheck_fee),
                'paid': str(existing_payments),
                'outstanding': str(outstanding_recheck),
                'payment_required': outstanding_recheck > 0,
            },
        }

        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching student recheck request details: {e}")
        return Response({"error": "An error occurred while fetching re-check request details"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def student_recheck_request_pay(request, recheck_request_id):
    """Student-only payment processing placeholder for accepted recheck requests.

    For now, this records the outstanding amount as paid on the student's EventRegistration.
    """
    user = request.user
    if getattr(user, 'role', None) != 'student':
        return Response({"error": "Only students can process payments"}, status=status.HTTP_403_FORBIDDEN)

    try:
        recheck_request = get_object_or_404(
            RecheckRequest, recheck_request_id=recheck_request_id, participant=user)
        if recheck_request.status != 'Accepted':
            return Response({"error": "Re-check request is not accepted yet"}, status=status.HTTP_400_BAD_REQUEST)

        from events.models import EventRegistration
        reg = get_object_or_404(
            EventRegistration, event=recheck_request.result.event, participant=user)

        registration_amount = getattr(
            reg, 'registration_amount', Decimal('100.00')) or Decimal('100.00')
        amount_paid = getattr(reg, 'amount_paid',
                              Decimal('0.00')) or Decimal('0.00')
        outstanding = registration_amount - amount_paid

        if outstanding <= 0:
            return Response({
                'message': 'No payment due',
                'registration': {
                    'registration_amount': str(registration_amount),
                    'amount_paid': str(amount_paid),
                    'outstanding': '0.00',
                    'payment_required': False,
                },
            }, status=status.HTTP_200_OK)

        # Record payment as fully paid (placeholder implementation)
        reg.amount_paid = registration_amount
        reg.save(update_fields=['amount_paid'])

        return Response({
            'message': 'Payment recorded successfully',
            'registration': {
                'registration_amount': str(reg.registration_amount),
                'amount_paid': str(reg.amount_paid),
                'outstanding': '0.00',
                'payment_required': False,
            },
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(
            f"Error processing payment for student recheck request {recheck_request_id}: {e}")
        return Response({"error": "An error occurred while processing payment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_recheck_payment(request, recheck_request_id):
    """Initiate a Razorpay payment for recheck request."""
    user = request.user
    if getattr(user, 'role', None) != 'student':
        return Response({"error": "Only students can initiate payments"}, status=status.HTTP_403_FORBIDDEN)

    try:
        logger.info(
            f"Initiating payment for recheck request ID: {recheck_request_id}")
        recheck_request = get_object_or_404(
            RecheckRequest, recheck_request_id=recheck_request_id, participant=user)
        logger.info(f"Found recheck request: {recheck_request}")

        if recheck_request.status != 'Accepted':
            return Response({"error": "Re-check request is not accepted yet"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if result exists
        if not hasattr(recheck_request, 'result') or not recheck_request.result:
            logger.error(
                f"Recheck request {recheck_request_id} has no associated result")
            return Response({"error": "Associated result not found"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        logger.info(f"Recheck request result: {recheck_request.result}")

        # Check if result has an event
        if not hasattr(recheck_request.result, 'event') or not recheck_request.result.event:
            logger.error(
                f"Recheck request result {recheck_request.result.id} has no associated event")
            return Response({"error": "Associated event not found"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        logger.info(
            f"Recheck request result event: {recheck_request.result.event}")

        from events.models import EventRegistration
        # Handle case where EventRegistration might not exist
        try:
            reg = EventRegistration.objects.get(
                event=recheck_request.result.event, participant=user)
            logger.info(f"Found existing EventRegistration: {reg}")
        except EventRegistration.DoesNotExist:
            # Create a default registration if it doesn't exist
            logger.info(
                f"Creating new EventRegistration for user {user} and event {recheck_request.result.event}")
            reg = EventRegistration.objects.create(
                event=recheck_request.result.event,
                participant=user,
                registration_amount=Decimal('100.00'),
                amount_paid=Decimal('0.00'),
                status='Pending'
            )
            logger.info(f"Created new EventRegistration: {reg}")
        except Exception as reg_error:
            logger.error(f"Error accessing EventRegistration: {reg_error}")
            return Response({"error": "Registration data error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # For recheck requests, we need to charge separately
        # The registration amount is for the event, but recheck requests may have their own fee
        # Default recheck request fee is ₹100
        recheck_fee = Decimal('100.00')
        logger.info(f"Recheck fee set to: {recheck_fee}")

        # Check if there are any Razorpay payments for this recheck request
        try:
            existing_payments_result = RazorpayPayment.objects.filter(
                recheck_request=recheck_request,
                status='captured'
            ).aggregate(total_paid=Sum('amount'))
            existing_payments = existing_payments_result['total_paid'] or Decimal(
                '0.00')
            logger.info(f"Existing captured payments: {existing_payments}")
        except Exception as payment_error:
            logger.error(f"Error querying existing payments: {payment_error}")
            return Response({"error": "Error accessing payment records"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Calculate outstanding recheck fee
        outstanding = recheck_fee - existing_payments
        logger.info(f"Calculated outstanding: {outstanding}")

        if outstanding <= 0:
            return Response({
                'message': 'No payment due for recheck request',
                'payment_required': False,
            }, status=status.HTTP_200_OK)

        # Ensure the amount is valid for Razorpay (minimum 1 rupee = 100 paisa)
        if outstanding < Decimal('0.01'):
            logger.error(
                f"Calculated outstanding amount is invalid: {outstanding}")
            return Response({"error": "Invalid payment amount calculated"}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure the amount is not too large (Razorpay max is INR 10,00,000)
        if outstanding > Decimal('1000000.00'):
            logger.error(
                f"Calculated outstanding amount is too large: {outstanding}")
            return Response({"error": "Payment amount exceeds maximum allowed limit"}, status=status.HTTP_400_BAD_REQUEST)

        # Initialize Razorpay client
        try:
            logger.info(
                f"Initializing Razorpay client with key: {settings.RAZORPAY_KEY_ID}")
            client = razorpay.Client(
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            logger.info("Razorpay client initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing Razorpay client: {e}")
            return Response({"error": "Payment gateway configuration error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Convert amount to paisa (smallest currency unit) - Razorpay expects amount in paisa
        amount_in_paisa = int(float(outstanding) * 100)

        # Validate the amount is within Razorpay limits (1 paisa to 100000000 paisa = 1000000 INR)
        if amount_in_paisa < 1:
            logger.error(f"Amount in paisa is too small: {amount_in_paisa}")
            return Response({"error": "Payment amount is too small. Minimum amount is 1 rupee."}, status=status.HTTP_400_BAD_REQUEST)

        if amount_in_paisa > 100000000:
            logger.error(f"Amount in paisa is too large: {amount_in_paisa}")
            return Response({"error": "Payment amount exceeds maximum allowed limit."}, status=status.HTTP_400_BAD_REQUEST)

        # Create Razorpay order
        # Truncate the receipt ID to comply with Razorpay's 40 character limit
        receipt_id = f'recheck_{recheck_request_id}'[:40]
        order_data = {
            'amount': amount_in_paisa,
            'currency': 'INR',
            'receipt': receipt_id,
            'payment_capture': 1  # Auto-capture payment
        }

        try:
            order_response = client.order.create(data=order_data)
            order_id = order_response['id']
        except Exception as e:
            logger.error(f"Error creating Razorpay order: {e}")
            logger.error(f"Order data sent: {order_data}")
            # More specific error handling for different types of errors
            error_msg = str(e)
            if 'amount' in error_msg.lower():
                return Response({"error": "Invalid payment amount. Amount must be at least 1 rupee (100 paisa)."}, status=status.HTTP_400_BAD_REQUEST)
            elif 'currency' in error_msg.lower():
                return Response({"error": "Invalid currency specified for payment."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": f"Payment gateway error: {str(e)[:100]}..."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Save payment record
        payment = RazorpayPayment.objects.create(
            recheck_request=recheck_request,
            razorpay_order_id=order_id,
            amount=outstanding,
            currency='INR',
            status='created'
        )

        return Response({
            'order_id': order_id,
            'amount': float(outstanding),
            'currency': 'INR',
            'payment_id': str(payment.id),
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(
            f"Error initiating recheck payment for request {recheck_request_id}: {e}")
        return Response({"error": "An error occurred while initiating payment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_recheck_payment(request):
    """Verify Razorpay payment and update registration status."""
    user = request.user
    if getattr(user, 'role', None) != 'student':
        return Response({"error": "Only students can verify payments"}, status=status.HTTP_403_FORBIDDEN)

    try:
        # Get payment details from request
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response({"error": "Missing payment details"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify the payment signature
        try:
            client = razorpay.Client(
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        except Exception as e:
            logger.error(
                f"Error initializing Razorpay client for verification: {e}")
            return Response({"error": "Payment gateway configuration error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Validate required parameters exist
        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            logger.error(f"Missing required payment verification parameters")
            return Response({"error": "Missing required payment verification parameters"}, status=status.HTTP_400_BAD_REQUEST)

        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }

        try:
            client.utility.verify_payment_signature(params_dict)
        except Exception as e:
            logger.error(f"Payment verification failed: {e}")
            # Provide more specific error message based on the exception
            error_msg = str(e).lower()
            if 'signature' in error_msg:
                return Response({"error": "Payment signature verification failed. Please contact support."}, status=status.HTTP_400_BAD_REQUEST)
            elif 'order' in error_msg:
                return Response({"error": "Invalid order ID provided for verification."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

        # Update payment status and registration
        payment = get_object_or_404(
            RazorpayPayment, razorpay_order_id=razorpay_order_id)

        # Make sure the payment belongs to the current user
        if payment.recheck_request.participant != user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        # Check if the payment's recheck request has a valid result
        if not hasattr(payment.recheck_request, 'result') or not payment.recheck_request.result:
            logger.error(
                f"Payment {razorpay_order_id} has recheck request with no associated result")
            return Response({"error": "Payment data error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Update payment record
        payment.razorpay_payment_id = razorpay_payment_id
        payment.razorpay_signature = razorpay_signature
        payment.status = 'captured'
        payment.save()

        # Update registration amount paid
        from events.models import EventRegistration
        # Handle case where EventRegistration might not exist
        try:
            reg = EventRegistration.objects.get(
                event=payment.recheck_request.result.event, participant=user)
        except EventRegistration.DoesNotExist:
            # Create a default registration if it doesn't exist
            reg = EventRegistration.objects.create(
                event=payment.recheck_request.result.event,
                participant=user,
                registration_amount=Decimal('100.00'),
                amount_paid=payment.amount,
                status='Confirmed'
            )
        except Exception as reg_error:
            logger.error(
                f"Error accessing EventRegistration in verification: {reg_error}")
            return Response({"error": "Registration data error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # Add the payment amount to the already paid amount
            reg.amount_paid += payment.amount
            reg.save(update_fields=['amount_paid'])

        return Response({
            'message': 'Payment verified successfully',
            'payment_status': 'captured',
            'registration': {
                'registration_amount': str(reg.registration_amount),
                'amount_paid': str(reg.amount_paid),
                'outstanding': str(reg.registration_amount - reg.amount_paid),
                'payment_required': (reg.registration_amount - reg.amount_paid) > 0,
            },
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error verifying recheck payment: {e}")
        return Response({"error": "An error occurred while verifying payment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_recheck_request(request):
    """
    POST /api/student/result-recheck
    Submit a re-check request for a student's result.

    Expected payload:
    {
        "result": <result_id>
    }

    Automatically collects participant information and routes to assigned volunteer.
    Prevents duplicate submissions for the same result.
    """
    user = request.user

    # Ensure only students can submit recheck requests
    if getattr(user, 'role', None) != 'student':
        return Response(
            {"error": "Only students can submit re-check requests"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        result_id = request.data.get('result')
        if not result_id:
            return Response(
                {"error": "Result ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the result and ensure it belongs to the requesting student
        result = get_object_or_404(Result, id=result_id, participant=user)

        # Get the reason from request data
        reason = request.data.get('reason', '')

        # Use the service to create the recheck request
        recheck_request = RecheckRequestService.create_recheck_request(
            result, user, reason)

        # Return the created request details
        response_serializer = RecheckRequestSerializer(recheck_request)

        return Response({
            "message": "Re-check request submitted successfully",
            "recheck_request": response_serializer.data
        }, status=status.HTTP_201_CREATED)

    except Result.DoesNotExist:
        return Response(
            {"error": "Result not found or you don't have permission to request re-check"},
            status=status.HTTP_404_NOT_FOUND
        )
    except (ValueError, ValidationError) as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error submitting recheck request: {e}")
        return Response(
            {"error": "An error occurred while submitting the re-check request"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Volunteer-side recheck workflow endpoints

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def volunteer_recheck_requests(request):
    """
    GET /api/volunteer/result-re-evaluation
    List all re-check requests assigned to the authenticated volunteer.

    Returns a list of re-check requests for events where the volunteer is assigned.
    Shows participant full name, category, event name, chest number, and final score.
    """
    user = request.user

    # Ensure only volunteers can access this endpoint
    if getattr(user, 'role', None) != 'volunteer':
        logger.warning(
            f"Non-volunteer user {user.id} attempted to access recheck requests. Role: {getattr(user, 'role', 'None')}")
        return Response(
            {"error": "Only volunteers can access re-check requests"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        # Use the service to get recheck requests
        recheck_requests = RecheckRequestService.get_volunteer_recheck_requests(
            user)

        # Serialize the requests
        from .serializers import RecheckRequestDetailSerializer
        serializer = RecheckRequestDetailSerializer(
            recheck_requests, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        logger.error(
            f"Error fetching volunteer recheck requests for user {user.id}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response(
            {"error": f"An error occurred while fetching re-check requests: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def volunteer_recheck_request_details(request, recheck_request_id):
    """
    GET /api/volunteer/result-re-evaluation/{recheckRequestId}
    Get detailed information about a specific re-check request.

    Returns detailed participant information for volunteer review.
    Verifies that the volunteer is assigned to the corresponding event.
    """
    user = request.user

    # Ensure only volunteers can access this endpoint
    if getattr(user, 'role', None) != 'volunteer':
        return Response(
            {"error": "Only volunteers can access re-check request details"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        # Use the service to get the recheck request
        recheck_request = RecheckRequestService.get_recheck_request_for_volunteer(
            recheck_request_id, user
        )

        if not recheck_request:
            return Response(
                {"error": "Re-check request not found or you don't have permission to view it"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Serialize the request with detailed information
        from .serializers import RecheckRequestDetailSerializer
        serializer = RecheckRequestDetailSerializer(recheck_request)

        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching recheck request details: {e}")
        return Response(
            {"error": "An error occurred while fetching re-check request details"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def volunteer_accept_recheck_request(request, recheck_request_id):
    """
    PUT /api/volunteer/result-re-evaluation/{recheckRequestId}/accept
    Accept a re-check request and update its status.

    Updates the request status to "Accepted" and records the acceptance timestamp.
    Verifies that the volunteer has proper authorization for the specific event.
    """
    user = request.user

    # Ensure only volunteers can accept recheck requests
    if getattr(user, 'role', None) != 'volunteer':
        return Response(
            {"error": "Only volunteers can accept re-check requests"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        # Use the service to accept the recheck request
        success, message, recheck_request = RecheckRequestService.accept_recheck_request(
            recheck_request_id, user
        )

        if not success:
            status_code = status.HTTP_404_NOT_FOUND if "not found" in message.lower(
            ) else status.HTTP_400_BAD_REQUEST
            return Response({"error": message}, status=status_code)

        # Serialize the updated request
        from .serializers import RecheckRequestDetailSerializer
        serializer = RecheckRequestDetailSerializer(recheck_request)

        # Get completion confirmation
        completion_data = RecheckRequestService.get_completion_confirmation(
            recheck_request)

        return Response({
            "message": message,
            "recheck_request": serializer.data,
            "completion": completion_data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error accepting recheck request: {e}")
        return Response(
            {"error": "An error occurred while accepting the re-check request"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def judge_recheck_requests(request):
    """
    GET /api/scores/judge/recheck-requests/
    List all re-check requests that have been accepted by volunteers and need to be re-analyzed by judges.

    Returns a list of re-check requests that have been accepted and are ready for re-analysis.
    """
    user = request.user

    # Ensure only judges can access this endpoint
    if getattr(user, 'role', None) != 'judge':
        logger.warning(
            f"Non-judge user {user.id} attempted to access recheck requests. Role: {getattr(user, 'role', 'None')}")
        return Response(
            {"error": "Only judges can access re-check requests"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        # Get all recheck requests that have been accepted by volunteers
        # These are the ones that need to be re-analyzed by judges
        recheck_requests = RecheckRequest.objects.filter(
            status='Accepted'
        ).select_related('result', 'participant', 'result__event').order_by('-accepted_at')

        # Serialize the requests
        from .serializers import RecheckRequestDetailSerializer
        serializer = RecheckRequestDetailSerializer(
            recheck_requests, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        logger.error(
            f"Error fetching judge recheck requests for user {user.id}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response(
            {"error": f"An error occurred while fetching re-check requests: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
