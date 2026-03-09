import os
import random
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple

import resend
from dotenv import load_dotenv

load_dotenv()

# In-memory OTP store: { email: { "otp": str, "expires_at": datetime } }
_otp_store: dict = {}

# Authenticated sessions: { token: email }
_auth_sessions: dict = {}

OTP_EXPIRY_MINUTES = 5
OTP_LENGTH = 6


def _get_allowed_emails() -> set:
    """Return set of allowed emails (lowercase). Supports ALLOWED_EMAILS (comma-separated) or MFA_EMAIL."""
    allowed = (os.getenv("ALLOWED_EMAILS") or "").strip()
    if allowed:
        return {e.strip().lower() for e in allowed.split(",") if e.strip()}
    mfa = (os.getenv("MFA_EMAIL") or "").strip().lower()
    return {mfa} if mfa else set()


def _send_email(to_email: str, subject: str, body: str) -> bool:
    """Send email via Resend. Returns True if sent, False otherwise."""
    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    from_addr = (os.getenv("RESEND_FROM") or "onboarding@resend.dev").strip()

    if not api_key:
        return False

    try:
        resend.api_key = api_key
        resend.Emails.send({
            "from": from_addr,
            "to": [to_email],
            "subject": subject,
            "text": body,
        })
        return True
    except Exception as e:
        print(f"DEBUG - Resend email error: {e}")
        return False


def request_otp(email: str) -> Tuple[bool, str]:
    """
    Request OTP for the given email.
    Returns (success, message).
    Only allows emails in ALLOWED_EMAILS (comma-separated) or MFA_EMAIL.
    """
    allowed = _get_allowed_emails()
    if not allowed:
        return False, "MFA not configured"

    email_clean = email.strip().lower()
    if email_clean not in allowed:
        return False, "Invalid email"

    otp = "".join(str(random.randint(0, 9)) for _ in range(OTP_LENGTH))
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    _otp_store[email_clean] = {"otp": otp, "expires_at": expires_at}

    # Send via email or log in dev mode
    sent = _send_email(
        email_clean,
        "Your login code",
        f"Your one-time code is: {otp}\n\nIt expires in {OTP_EXPIRY_MINUTES} minutes.",
    )
    if not sent:
        print(f"DEBUG - MFA OTP for {email_clean}: {otp} (Resend not configured, check console)")
        # Still allow - dev mode

    return True, "OTP sent" if sent else "OTP generated (check server logs if RESEND_API_KEY not set)"


def verify_otp(email: str, otp: str) -> Optional[str]:
    """
    Verify OTP. Returns session token if valid, None otherwise.
    """
    email_clean = email.strip().lower()
    stored = _otp_store.get(email_clean)
    if not stored:
        return None
    if stored["expires_at"] < datetime.utcnow():
        del _otp_store[email_clean]
        return None
    if stored["otp"] != otp.strip():
        return None

    # Valid - create session token
    del _otp_store[email_clean]
    token = str(uuid.uuid4())
    _auth_sessions[token] = email_clean
    return token


def verify_token(token: Optional[str]) -> bool:
    """Check if token is valid."""
    if not token:
        return False
    return token.strip() in _auth_sessions
