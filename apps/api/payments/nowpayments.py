"""
NOWPayments.io Integration
Crypto-only payment provider for deposits
"""

import httpx
import hashlib
import hmac
import logging
from typing import Dict, Any, Optional, List
from decimal import Decimal

from core.config import settings

logger = logging.getLogger(__name__)


class NOWPaymentsClient:
    """NOWPayments.io API client"""
    
    def __init__(self):
        self.api_key = settings.NOWPAYMENTS_API_KEY
        self.ipn_secret = settings.NOWPAYMENTS_IPN_SECRET
        self.base_url = settings.NOWPAYMENTS_API_URL
        self.sandbox = settings.NOWPAYMENTS_SANDBOX
        
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
        }
    
    async def get_available_currencies(self) -> List[str]:
        """
        Get list of available cryptocurrencies
        
        Returns:
            List of currency codes (e.g., ['btc', 'eth', 'usdt', ...])
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/currencies",
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()
                return data.get("currencies", [])
        except Exception as e:
            logger.error(f"Failed to get available currencies: {str(e)}")
            raise
    
    async def get_minimum_amount(self, currency: str) -> Decimal:
        """
        Get minimum deposit amount for currency
        
        Args:
            currency: Cryptocurrency code (e.g., 'btc', 'eth')
        
        Returns:
            Minimum amount in the specified currency
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/min-amount",
                    params={"currency_from": currency, "currency_to": "usd"},
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()
                return Decimal(str(data.get("min_amount", "0")))
        except Exception as e:
            logger.error(f"Failed to get minimum amount: {str(e)}")
            return Decimal("0.0001")  # Default fallback
    
    async def create_payment(
        self,
        price_amount: float,
        price_currency: str = "usd",
        pay_currency: str = "btc",
        order_id: str = None,
        order_description: str = None,
        ipn_callback_url: str = None,
    ) -> Dict[str, Any]:
        """
        Create a new payment
        
        Args:
            price_amount: Amount in price_currency
            price_currency: Currency to price the order (default: usd)
            pay_currency: Cryptocurrency for payment (e.g., 'btc', 'eth')
            order_id: Your internal order ID
            order_description: Description of the order
            ipn_callback_url: URL for IPN callbacks
        
        Returns:
            Payment details including address and payment_id
        """
        payload = {
            "price_amount": price_amount,
            "price_currency": price_currency,
            "pay_currency": pay_currency,
            "order_id": order_id,
            "order_description": order_description or "Topcoin deposit",
        }
        
        if ipn_callback_url:
            payload["ipn_callback_url"] = ipn_callback_url
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/payment",
                    json=payload,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                logger.info(f"Payment created: {data.get('payment_id')}")
                return data
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error creating payment: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Failed to create payment: {str(e)}")
            raise
    
    async def get_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """
        Get payment status
        
        Args:
            payment_id: NOWPayments payment ID
        
        Returns:
            Payment status details
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/payment/{payment_id}",
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to get payment status: {str(e)}")
            raise
    
    async def get_estimate(
        self,
        amount: float,
        currency_from: str,
        currency_to: str = "usd"
    ) -> Dict[str, Any]:
        """
        Get estimated exchange amount
        
        Args:
            amount: Amount to convert
            currency_from: Source currency
            currency_to: Target currency
        
        Returns:
            Estimated conversion details
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/estimate",
                    params={
                        "amount": amount,
                        "currency_from": currency_from,
                        "currency_to": currency_to,
                    },
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to get estimate: {str(e)}")
            raise
    
    def verify_ipn_signature(
        self,
        request_body: bytes,
        signature: str
    ) -> bool:
        """
        Verify IPN callback signature
        
        Args:
            request_body: Raw request body bytes
            signature: Signature from x-nowpayments-sig header
        
        Returns:
            True if signature is valid
        """
        try:
            expected_signature = hmac.new(
                self.ipn_secret.encode('utf-8'),
                request_body,
                hashlib.sha512
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"Signature verification failed: {str(e)}")
            return False
    
    async def create_invoice(
        self,
        price_amount: float,
        price_currency: str = "usd",
        order_id: str = None,
        order_description: str = None,
        success_url: str = None,
        cancel_url: str = None,
    ) -> Dict[str, Any]:
        """
        Create payment invoice (hosted payment page)
        
        Args:
            price_amount: Amount in price_currency
            price_currency: Currency to price the order
            order_id: Your internal order ID
            order_description: Description
            success_url: Redirect URL on success
            cancel_url: Redirect URL on cancel
        
        Returns:
            Invoice details including invoice_url
        """
        payload = {
            "price_amount": price_amount,
            "price_currency": price_currency,
            "order_id": order_id,
            "order_description": order_description or "Topcoin deposit",
        }
        
        if success_url:
            payload["success_url"] = success_url
        if cancel_url:
            payload["cancel_url"] = cancel_url
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/invoice",
                    json=payload,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                logger.info(f"Invoice created: {data.get('id')}")
                return data
                
        except Exception as e:
            logger.error(f"Failed to create invoice: {str(e)}")
            raise


# Global client instance
nowpayments_client = NOWPaymentsClient()
