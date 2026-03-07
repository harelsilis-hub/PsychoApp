"""
Run this once to generate VAPID keys, then add the output to your .env file.
Usage: python generate_vapid_keys.py
"""
import base64
from py_vapid import Vapid
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

vapid = Vapid()
vapid.generate_keys()

# Private key: export the raw 32-byte scalar
private_int = vapid.private_key.private_numbers().private_value
private_bytes = private_int.to_bytes(32, 'big')

# Public key: uncompressed point format (65 bytes)
public_bytes = vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)

private_key = base64.urlsafe_b64encode(private_bytes).decode().rstrip("=")
public_key = base64.urlsafe_b64encode(public_bytes).decode().rstrip("=")

print("Add these to your backend .env file:")
print(f"VAPID_PRIVATE_KEY={private_key}")
print(f"VAPID_PUBLIC_KEY={public_key}")
