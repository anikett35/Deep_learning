"""
Audit Logging Service.
Appends tamper-evident audit trail entries in PostgreSQL for all critical security events:
- Model registration & lifecycle changes
- Watermark trigger generation & inspection
- Black-box extraction jobs
- Statistical verification executions
- Cryptographic certificate generation & validation
- Adaptive attack benchmarks
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.db import models


def log_audit_event(
    db: Session,
    event_type: str,
    action: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    user_ip: str = "127.0.0.1"
) -> models.AuditLog:
    """Creates and commits an append-only audit log entry."""
    entry = models.AuditLog(
        event_type=event_type,
        action=action,
        resource_id=resource_id,
        details=details or {},
        user_ip=user_ip,
        created_at=datetime.now(timezone.utc)
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_audit_logs(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    event_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieves audit trail with optional filtering and pagination."""
    query = db.query(models.AuditLog)
    if event_type:
        query = query.filter(models.AuditLog.event_type == event_type)
        
    records = query.order_by(models.AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    return [
        {
            "id": r.id,
            "event_type": r.event_type,
            "action": r.action,
            "resource_id": r.resource_id,
            "details": r.details,
            "user_ip": r.user_ip,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in records
    ]
