"""
Celery tasks for order processing
Handles pending limit/stop order execution
"""

from celery import shared_task
import logging

from core.order_processor import process_pending_orders

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_pending_limit_stop_orders(self):
    """
    Periodic task to check and execute pending limit/stop orders
    Runs every 30 seconds via Celery Beat
    """
    try:
        logger.info("Processing pending limit/stop orders...")
        
        result = process_pending_orders()
        
        logger.info(f"✅ Order processing complete: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error processing pending orders: {str(e)}")
        raise self.retry(exc=e, countdown=30)

