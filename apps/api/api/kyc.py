"""
KYC API Routes - Document submission with auto-approval
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
import logging
import os
import uuid
from pathlib import Path

from core.database import get_session
from core.dependencies import get_current_user
from models.user import User, KYCStatus
from models.audit import Audit, AuditAction

logger = logging.getLogger(__name__)
router = APIRouter()

# Upload directory for KYC documents
UPLOAD_DIR = Path("uploads/kyc")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/submit", status_code=status.HTTP_200_OK)
async def submit_kyc_documents(
    id_document: UploadFile = File(..., description="ID card or passport"),
    selfie: UploadFile = File(..., description="Selfie photo"),
    proof_of_address: UploadFile = File(..., description="Proof of address document"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Submit KYC documents with AUTO-APPROVAL
    
    CRITICAL FLOW:
    - User uploads documents
    - System AUTOMATICALLY sets kyc_status = 'auto_approved' (instant approval)
    - Admin reviews post-approval
    - Complete audit trail maintained
    """
    logger.info(f"KYC submission for user {current_user.id}")
    
    # Validate file types and sizes
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.pdf'}
    max_file_size = 10 * 1024 * 1024  # 10MB per file
    
    files_to_validate = [
        (id_document, "ID document"),
        (selfie, "Selfie"),
        (proof_of_address, "Proof of address")
    ]
    
    for file, name in files_to_validate:
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{name} is required"
            )
        
        # Validate file extension
        ext = Path(file.filename).suffix.lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{name} must be JPG, PNG, or PDF. Received: {ext}"
            )
        
        # Validate file size (read content to check size)
        content = await file.read()
        file_size = len(content)
        
        if file_size > max_file_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{name} exceeds maximum size of 10MB. File size: {file_size / 1024 / 1024:.2f}MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{name} is empty"
            )
        
        # Reset file pointer for later reading
        await file.seek(0)
    
    # Save uploaded files
    user_upload_dir = UPLOAD_DIR / str(current_user.id)
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_paths = {}
    saved_files = []  # Track saved files for cleanup on error
    
    try:
        # Save ID document
        id_filename = f"id_{uuid.uuid4().hex[:8]}{Path(id_document.filename).suffix}"
        id_path = user_upload_dir / id_filename
        content = await id_document.read()
        with open(id_path, "wb") as f:
            f.write(content)
        file_paths['id_document'] = str(id_path.relative_to("uploads"))
        saved_files.append(id_path)
        
        # Save selfie
        selfie_filename = f"selfie_{uuid.uuid4().hex[:8]}{Path(selfie.filename).suffix}"
        selfie_path = user_upload_dir / selfie_filename
        content = await selfie.read()
        with open(selfie_path, "wb") as f:
            f.write(content)
        file_paths['selfie'] = str(selfie_path.relative_to("uploads"))
        saved_files.append(selfie_path)
        
        # Save proof of address
        poa_filename = f"poa_{uuid.uuid4().hex[:8]}{Path(proof_of_address.filename).suffix}"
        poa_path = user_upload_dir / poa_filename
        content = await proof_of_address.read()
        with open(poa_path, "wb") as f:
            f.write(content)
        file_paths['proof_of_address'] = str(poa_path.relative_to("uploads"))
        saved_files.append(poa_path)
        
    except Exception as e:
        logger.error(f"Failed to save KYC documents for user {current_user.id}: {e}")
        
        # Clean up any saved files on error
        for file_path in saved_files:
            try:
                if file_path.exists():
                    file_path.unlink()
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup file {file_path}: {cleanup_error}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save documents. Please try again."
        )
    
    # AUTO-APPROVE: Set status to auto_approved immediately
    try:
        previous_status = current_user.kyc_status
        current_user.kyc_status = KYCStatus.AUTO_APPROVED
        current_user.kyc_submitted_at = datetime.utcnow()
        current_user.kyc_id_document = file_paths['id_document']
        current_user.kyc_selfie = file_paths['selfie']
        current_user.kyc_proof_of_address = file_paths['proof_of_address']
        current_user.updated_at = datetime.utcnow()
        
        # Create audit log for auto-approval
        audit = Audit(
            actor_user_id=current_user.id,
            action=AuditAction.KYC_SUBMITTED,
            object_type="user",
            object_id=current_user.id,
            diff={
                "kyc_status": {
                    "before": previous_status.value if previous_status else None,
                    "after": KYCStatus.AUTO_APPROVED.value
                }
            },
            reason="KYC documents submitted - auto-approved for instant access"
        )
        
        session.add(current_user)
        session.add(audit)
        await session.commit()
        await session.refresh(current_user)
        
        logger.info(f"User {current_user.id} KYC auto-approved after document submission")
        
        return {
            "message": "KYC documents submitted and auto-approved successfully",
            "kyc_status": current_user.kyc_status.value,
            "submitted_at": current_user.kyc_submitted_at.isoformat(),
            "note": "Your KYC has been auto-approved. Admin will review your documents post-approval."
        }
    except Exception as e:
        # Rollback database changes and cleanup files on error
        await session.rollback()
        logger.error(f"Failed to update KYC status for user {current_user.id}: {e}")
        
        # Clean up saved files
        for file_path in saved_files:
            try:
                if file_path.exists():
                    file_path.unlink()
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup file {file_path}: {cleanup_error}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process KYC submission. Please try again."
        )


@router.get("/status")
async def get_kyc_status(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get current KYC status for authenticated user"""
    return {
        "kyc_status": current_user.kyc_status.value,
        "submitted_at": current_user.kyc_submitted_at.isoformat() if current_user.kyc_submitted_at else None,
        "reviewed_at": current_user.kyc_reviewed_at.isoformat() if current_user.kyc_reviewed_at else None,
        "rejection_reason": current_user.kyc_rejection_reason,
        "has_documents": bool(current_user.kyc_id_document and current_user.kyc_selfie and current_user.kyc_proof_of_address)
    }

