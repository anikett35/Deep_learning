"""
API Endpoints for Append-Only Audit Trail.
Exposes security events, timestamps, and resource actions.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.audit_service import get_audit_logs

router = APIRouter()


@router.get("/audit")
def list_audit_trail(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    event_type: Optional[str] = Query(None, description="Filter: MODEL_REGISTER, EXTRACTION_JOB, VERIFICATION, CERTIFICATE_AUDIT"),
    db: Session = Depends(get_db)
):
    """Retrieves immutable audit event history from PostgreSQL."""
    return get_audit_logs(db, limit=limit, offset=offset, event_type=event_type)
