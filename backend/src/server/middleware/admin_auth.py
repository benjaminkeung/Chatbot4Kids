import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

bearer_scheme = HTTPBearer()


def require_admin(credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)):
    admin_token = os.getenv("ADMIN_TOKEN", "")
    if not admin_token or credentials.credentials != admin_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
