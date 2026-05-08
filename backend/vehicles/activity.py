from .models import ActivityLog


def log_activity(request, action, vehicle=None, details=""):
    user = getattr(request, "user", None)
    actor = user.get_username() if user and user.is_authenticated else ""
    ActivityLog.objects.create(
        vehicle=vehicle,
        actor=actor,
        action=action,
        details=details,
    )
