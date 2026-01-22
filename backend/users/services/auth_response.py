def build_auth_response(
    user,
    access=None,
    refresh=None,
    message=None,
):
    role = (getattr(user, "role", "") or "").strip().lower()
    approval_status = (getattr(user, "approval_status", "") or "").strip().lower()

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "approval_status": user.approval_status,
            "must_reset_password": user.must_reset_password,
            "is_active": user.is_active,
        },
        "tokens": {
            "access": access,
            "refresh": refresh,
        } if access or refresh else None,
        "meta": {
            "message": message,
            "requires_approval": role in ["judge", "volunteer"]
            and approval_status != "approved",
            "must_reset_password": user.must_reset_password,
        }
    }
