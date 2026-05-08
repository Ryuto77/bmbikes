import json
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.http import JsonResponse
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_POST

logger = logging.getLogger(__name__)


@ensure_csrf_cookie
def auth_status(request):
    user = request.user
    return JsonResponse({
        "is_authenticated": user.is_authenticated,
        "username": user.get_username() if user.is_authenticated else "",
        "is_staff": user.is_staff if user.is_authenticated else False,
    })


@require_POST
@csrf_protect
def login_user(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        data = {}

    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = authenticate(request, username=username, password=password)

    if user is None and username:
        User = get_user_model()
        candidates = []

        if username.isdigit():
            candidates.extend(User.objects.filter(pk=int(username)))

        candidates.extend(User.objects.filter(username__iexact=username))
        if hasattr(User, "email"):
            candidates.extend(User.objects.filter(email__iexact=username))

        seen = set()
        for candidate in candidates:
            if candidate.pk in seen:
                continue
            seen.add(candidate.pk)

            user = authenticate(request, username=candidate.get_username(), password=password)
            if user is not None:
                break

    if user is None:
        return JsonResponse({"error": "Invalid username, email, or password."}, status=400)

    if not user.is_active:
        return JsonResponse({"error": "This account is inactive."}, status=400)

    login(request, user)
    return JsonResponse({
        "is_authenticated": True,
        "username": user.get_username(),
        "is_staff": user.is_staff,
    })


@require_POST
@csrf_protect
def logout_user(request):
    logout(request)
    return JsonResponse({"is_authenticated": False})


def parse_json_body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return {}


def smtp_email_is_configured():
    backend = getattr(settings, "EMAIL_BACKEND", "")
    if "smtp.EmailBackend" not in backend:
        return True
    required = [
        getattr(settings, "EMAIL_HOST", "").strip(),
        getattr(settings, "EMAIL_HOST_USER", "").strip(),
        getattr(settings, "EMAIL_HOST_PASSWORD", "").strip(),
        getattr(settings, "DEFAULT_FROM_EMAIL", "").strip(),
        getattr(settings, "FRONTEND_BASE_URL", "").strip(),
    ]
    return all(required)


@require_POST
@csrf_protect
def password_reset_request(request):
    data = parse_json_body(request)
    email = (data.get("email") or "").strip()

    if email and not smtp_email_is_configured():
        return JsonResponse({"error": "Password reset email is not configured on the server."}, status=500)

    if email:
        User = get_user_model()
        users = User.objects.filter(email__iexact=email, is_active=True)
        for user in users:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password/{uid}/{token}"
            try:
                expiry_hours = max(1, settings.PASSWORD_RESET_TIMEOUT // 3600)
                expiry_label = f"{expiry_hours} hour" + ("s" if expiry_hours != 1 else "")
                text_body = (
                    f"Hello {user.get_username()},\n\n"
                    "We received a request to reset your Best Motors password.\n\n"
                    "Use the link below to set a new password:\n"
                    f"{reset_url}\n\n"
                    f"This link expires in {expiry_label}.\n"
                    "It also becomes invalid after your password is changed.\n\n"
                    "If you did not request this, you can ignore this email."
                )
                html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Best Motors password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial, sans-serif;color:#111111">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f5f7; margin:0; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px; background-color:#101010; border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 18px; background-color:#171717;">
              <div style="font-size:12px; line-height:1; letter-spacing:1.6px; text-transform:uppercase; color:#ff3b4f; font-weight:700;">Best Motors</div>
              <h1 style="margin:14px 0 0; font-size:28px; line-height:1.2; color:#f7f7f7; font-weight:700;">Reset your password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#f7f7f7;">Hello {user.get_username()},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#d4d4d8;">
                We received a request to reset your Best Motors password. Use the button below to choose a new password.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td align="center" bgcolor="#d90429" style="border-radius:10px;">
                    <a href="{reset_url}" style="display:inline-block; padding:14px 24px; font-size:15px; line-height:1; color:#ffffff; text-decoration:none; font-weight:700;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px; font-size:14px; line-height:1.7; color:#a1a1aa;">
                This link expires in {expiry_label} and becomes invalid after your password is changed.
              </p>
              <p style="margin:0 0 18px; font-size:14px; line-height:1.7; color:#a1a1aa;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px; font-size:13px; line-height:1.7; color:#ff8796; word-break:break-all;">
                <a href="{reset_url}" style="color:#ff8796; text-decoration:none;">{reset_url}</a>
              </p>
              <p style="margin:0; font-size:14px; line-height:1.7; color:#a1a1aa;">
                If you did not request this, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
                message = EmailMultiAlternatives(
                    "Reset your Best Motors password",
                    text_body,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                )
                message.attach_alternative(html_body, "text/html")
                message.send(fail_silently=False)
            except Exception:
                logger.exception("Password reset email failed for user id %s", user.pk)
                return JsonResponse({"error": "Unable to send password reset email. Check server email settings."}, status=500)

    return JsonResponse({
        "message": "If that email matches an active account, a reset link has been sent."
    })


@require_POST
@csrf_protect
def password_reset_confirm(request):
    data = parse_json_body(request)
    uid = data.get("uid", "")
    token = data.get("token", "")
    password = data.get("password", "")

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = get_user_model().objects.get(pk=user_id, is_active=True)
    except Exception:
        return JsonResponse({"error": "This reset link is invalid or expired."}, status=400)

    if not default_token_generator.check_token(user, token):
        return JsonResponse({"error": "This reset link is invalid or expired."}, status=400)

    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        return JsonResponse({"error": " ".join(exc.messages)}, status=400)

    user.set_password(password)
    user.save(update_fields=["password"])
    return JsonResponse({"message": "Password updated. You can now log in."})
