#!/usr/bin/env python3
"""
JWT Secret Generator for Topcoin Platform
Generates a cryptographically secure JWT secret for production use.
"""

import secrets
import string
import hashlib
import base64
from datetime import datetime

def generate_jwt_secret(length=64):
    """Generate a cryptographically secure JWT secret"""
    # Method 1: Using secrets.token_urlsafe (recommended)
    secret_urlsafe = secrets.token_urlsafe(length)
    
    # Method 2: Using secrets.token_hex
    secret_hex = secrets.token_hex(length)
    
    # Method 3: Using random bytes + base64
    random_bytes = secrets.token_bytes(length)
    secret_b64 = base64.urlsafe_b64encode(random_bytes).decode('utf-8')
    
    # Method 4: Custom alphanumeric + symbols
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()_+-=[]{}|;:,.<>?"
    secret_custom = ''.join(secrets.choice(alphabet) for _ in range(length))
    
    return {
        'urlsafe': secret_urlsafe,
        'hex': secret_hex,
        'base64': secret_b64,
        'custom': secret_custom
    }

def generate_multiple_secrets():
    """Generate multiple JWT secrets for different environments"""
    secrets_data = {
        'development': generate_jwt_secret(32),
        'staging': generate_jwt_secret(48),
        'production': generate_jwt_secret(64)
    }
    return secrets_data

def main():
    print("JWT Secret Generator for Topcoin Platform")
    print("=" * 50)
    print(f"Generated at: {datetime.now().isoformat()}")
    print()
    
    # Generate secrets for different environments
    all_secrets = generate_multiple_secrets()
    
    for env, secrets_dict in all_secrets.items():
        print(f"{env.upper()} ENVIRONMENT:")
        print(f"   URL-Safe (Recommended): {secrets_dict['urlsafe']}")
        print(f"   Hex Format:             {secrets_dict['hex']}")
        print(f"   Base64 Format:          {secrets_dict['base64']}")
        print(f"   Custom Format:          {secrets_dict['custom']}")
        print()
    
    # Recommended production secret
    production_secret = all_secrets['production']['urlsafe']
    print("RECOMMENDED FOR RAILWAY PRODUCTION:")
    print(f"JWT_SECRET={production_secret}")
    print()
    
    # Security recommendations
    print("SECURITY RECOMMENDATIONS:")
    print("1. Use the URL-Safe format for Railway deployment")
    print("2. Never commit secrets to version control")
    print("3. Store in Railway environment variables only")
    print("4. Rotate secrets periodically (every 90 days)")
    print("5. Use different secrets for each environment")
    print()
    
    # Railway environment variable format
    print("COPY THIS FOR RAILWAY ENVIRONMENT VARIABLES:")
    print("-" * 50)
    print(f"JWT_SECRET={production_secret}")
    print("JWT_ALGORITHM=HS256")
    print("-" * 50)

if __name__ == "__main__":
    main()
