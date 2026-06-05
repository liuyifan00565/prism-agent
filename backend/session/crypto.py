from cryptography.fernet import Fernet
from pathlib import Path

KEY_FILE = Path.home() / ".prism" / "key.bin"

def _get_key() -> bytes:
    if KEY_FILE.exists():
        return KEY_FILE.read_bytes()
    key = Fernet.generate_key()
    KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    KEY_FILE.write_bytes(key)
    return key

def encrypt(data: bytes) -> bytes:
    return Fernet(_get_key()).encrypt(data)

def decrypt(data: bytes) -> bytes:
    return Fernet(_get_key()).decrypt(data)
