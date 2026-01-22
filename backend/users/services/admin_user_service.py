import secrets
from django.core.mail import send_mail
from django.db import transaction
from users.models import User, AllowedEmail
from events.models import Event, EventRegistration, ParticipantVerification, Judge as JudgeProfile
from scores.models import Score, Result
from volunteers.models import VolunteerAssignment
from notifications.models import Notification
from certificates.models import Certificate
from feedback.models import Feedback


def delete_user_with_cleanup(user, acting_admin=None):
    """Delete user with comprehensive cleanup of related data"""
    with transaction.atomic():
        # Step 1: Detach M2M assignments to avoid residual relations
        try:
            user.assigned_events.clear()
        except Exception:
            pass
        try:
            user.assigned_volunteer_events.clear()
        except Exception:
            pass

        # Step 2: Reassign events created by this user to the acting admin
        try:
            if acting_admin and acting_admin.id != user.id:
                Event.objects.filter(created_by=user).update(
                    created_by_id=acting_admin.id)
        except Exception:
            # Non-critical; proceed with deletion even if reassignment fails
            pass

        # Step 3: Reassign AllowedEmail records created by this user
        try:
            if acting_admin and acting_admin.id != user.id:
                # Reassign to acting admin instead of deleting
                AllowedEmail.objects.filter(created_by=user).update(
                    created_by_id=acting_admin.id)
            else:
                # If no valid admin to reassign to, set to NULL
                AllowedEmail.objects.filter(
                    created_by=user).update(created_by_id=None)
        except Exception:
            pass

        # Step 4: Remove dependent rows across apps
        try:
            # Delete in order to avoid FK constraint violations
            EventRegistration.objects.filter(participant=user).delete()
            ParticipantVerification.objects.filter(
                participant=user, volunteer=user
            ).delete()
            Score.objects.filter(participant=user, judge=user).delete()
            Result.objects.filter(participant=user).delete()
            VolunteerAssignment.objects.filter(volunteer=user).delete()
            Notification.objects.filter(user=user).delete()
            Certificate.objects.filter(participant=user).delete()
            Feedback.objects.filter(user=user).delete()
            JudgeProfile.objects.filter(user=user).delete()
        except Exception:
            pass

        # Step 5: Perform the actual delete
        user.delete()


def would_remove_last_admin(exclude_user_id=None):
    """Return True if disabling/removing admin role would leave no active admins."""
    qs = User.objects.filter(role='admin', is_active=True)
    if exclude_user_id:
        qs = qs.exclude(pk=exclude_user_id)
    return not qs.exists()


def toggle_user_active(user, target_state, acting_admin=None):
    """Toggle user active status with protection for last admin"""
    if user.role == 'admin' and not target_state and would_remove_last_admin(exclude_user_id=user.id):
        raise ValueError('Cannot deactivate the last active admin')

    user.is_active = target_state
    user.save(update_fields=['is_active'])
    return user


def set_user_role(user, new_role, acting_admin=None):
    """Set user role with protection for last admin"""
    valid_roles = [choice[0]
                   for choice in User._meta.get_field('role').choices]
    if new_role not in valid_roles:
        raise ValueError('Invalid role')

    if user.role == 'admin' and new_role != 'admin' and would_remove_last_admin(exclude_user_id=user.id):
        raise ValueError('Cannot remove admin role from the last active admin')

    user.role = new_role
    user.save(update_fields=['role'])
    return user


def set_user_approval(user, new_status, acting_admin=None):
    """Set user approval status with email notifications"""
    valid_status = [choice[0]
                    for choice in User._meta.get_field('approval_status').choices]
    if new_status not in valid_status:
        raise ValueError('Invalid approval_status')

    user.approval_status = new_status
    user.save(update_fields=['approval_status'])

    # Send emails and act based on approval
    try:
        if new_status == 'approved':
            user.is_active = True

            update_fields = ['is_active']

            temp_password = None
            if not user.has_usable_password():
                temp_password = secrets.token_urlsafe(8)
                user.set_password(temp_password)
                user.must_reset_password = True
                update_fields.extend(['password', 'must_reset_password'])
            else:
                if user.must_reset_password:
                    user.must_reset_password = False
                    update_fields.append('must_reset_password')

            user.save(update_fields=update_fields)

            if temp_password:
                subject = 'Account Approved - E-Kalolsavam'
                message = f'Your account has been approved.\n\nTemporary Password: {temp_password}\nUsername: {user.username}\n\nPlease sign in and set a new password.'
                send_mail(subject, message, 'joelfrancisjoy@gmail.com',
                          [user.email], fail_silently=True)
        elif new_status == 'rejected':
            # Inform judge and delete profile
            subject = 'Judge Registration Rejected - E-Kalolsavam'
            message = 'We are sorry to inform your judge registration was rejected.'
            send_mail(subject, message, 'joelfrancisjoy@gmail.com',
                      [user.email], fail_silently=True)
            user.delete()
    except Exception:
        pass

    return user
