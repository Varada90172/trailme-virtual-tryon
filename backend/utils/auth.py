import hashlib
import hmac
import os

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2 HMAC SHA-256 with a unique salt."""
    salt = os.urandom(16)
    db_val = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt.hex() + ":" + db_val.hex()

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    try:
        salt_hex, hash_hex = hashed.split(":")
        salt = bytes.fromhex(salt_hex)
        db_val = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(db_val.hex(), hash_hex)
    except Exception:
        return False
