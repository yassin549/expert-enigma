#!/usr/bin/env python3
"""
Railway Secrets Generator for Topcoin Platform
Generates all required secrets for Railway deployment.
"""

import secrets
import string
import hashlib
from datetime import datetime

def generate_secure_password(length=16):
    """Generate a secure admin password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

def generate_session_secret(length=64):
    """Generate a secure session secret"""
    return secrets.token_urlsafe(length)

def generate_jwt_secret(length=64):
    """Generate a secure JWT secret"""
    return secrets.token_urlsafe(length)

def main():
    print("Railway Secrets Generator for Topcoin Platform")
    print("=" * 60)
    print(f"Generated at: {datetime.now().isoformat()}")
    print()
    
    # Generate all required secrets
    admin_password = generate_secure_password(20)
    session_secret = generate_session_secret(64)
    jwt_secret = generate_jwt_secret(64)
    
    print("REQUIRED RAILWAY ENVIRONMENT VARIABLES:")
    print("=" * 60)
    print()
    
    print("# Security Secrets")
    print(f"ADMIN_PASSWORD={admin_password}")
    print(f"SESSION_SECRET={session_secret}")
    print(f"JWT_SECRET={jwt_secret}")
    print("JWT_ALGORITHM=HS256")
    print()
    
    print("# Database & Redis (use your Railway connection strings)")
    print("DATABASE_URL=postgresql://postgres:vfrpgZzDnbxzqBfUOmmkqLlRwcVlsRsQ@switchyard.proxy.rlwy.net:46344/railway")
    print("REDIS_URL=redis://default:BIyXIxRfZJJitZyQvlqxMpVYvkxhXChW@ballast.proxy.rlwy.net:45220")
    print()
    
    print("# NOWPayments Configuration")
    print("NOWPAYMENTS_API_KEY=A53GE0J-PPD4G6Z-NFVAC23-GNBEFAH")
    print("NOWPAYMENTS_PUBLIC_KEY=c83c4ff4-30e7-4bd8-8d91-4d4912ac5863")
    print("NOWPAYMENTS_IPN_SECRET=OemSUwv9OSlRrCjhEV5lMTzfBGKanpen")
    print()
    
    print("# Environment Configuration")
    print("ENVIRONMENT=production")
    print("LOG_LEVEL=INFO")
    print()
    
    print("=" * 60)
    print("ADMIN LOGIN CREDENTIALS:")
    print("=" * 60)
    print("Email: admin@topcoin.local")
    print(f"Password: {admin_password}")
    print()
    print("IMPORTANT: Save these credentials securely!")
    print("You'll need them to access the admin dashboard.")
    print("=" * 60)

if __name__ == "__main__":
    main()
