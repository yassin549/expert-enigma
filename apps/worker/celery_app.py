"""
Celery Application for Background Jobs
Handles deposit reconciliation, notifications, and scheduled tasks
"""

from celery import Celery
from celery.schedules import crontab
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get configuration from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# Initialize Celery app
app = Celery(
    "topcoin_worker",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        # Only include implemented task modules to avoid import errors
        "worker.tasks.deposits",
        "worker.tasks.orders",
    ],
)

# Celery configuration
app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    task_soft_time_limit=240,  # 4 minutes
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
)

# Periodic tasks (Celery Beat schedule)
app.conf.beat_schedule = {
    # Check for pending deposits every 2 minutes
    "check-pending-deposits": {
        "task": "worker.tasks.deposits.check_pending_deposits",
        "schedule": 120.0,  # Every 2 minutes
    },
    # Process pending limit/stop orders every 30 seconds
    "process-pending-orders": {
        "task": "worker.tasks.orders.process_pending_limit_stop_orders",
        "schedule": 30.0,  # Every 30 seconds
    },
}

logger.info("✅ Celery app initialized successfully")


@app.task(bind=True)
def debug_task(self):
    """Debug task for testing"""
    print(f"Request: {self.request!r}")
    return "Debug task completed"
