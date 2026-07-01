# backend/core/ai_client.py
import os
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)

class AIClientWrapper:
    """
    Central AI Client that initializes Groq or DeepSeek depending on available API keys in environment.
    """
    def __init__(self):
        self._provider = None
        self._client = None
        self._model = None
        self._initialized = False

    def _initialize(self):
        if self._initialized:
            return

        # Fetch environment keys
        groq_key = os.environ.get('GROQ_API_KEY')
        deepseek_key = os.environ.get('DEEPSEEK_API_KEY')
        
        # Priority 1: Groq
        if groq_key:
            self._provider = 'groq'
            self._model = os.environ.get('GROQ_MODEL', 'llama-3.1-8b-instant')
            try:
                from groq import Groq
                self._client = Groq(api_key=groq_key)
                logger.info(f"[AI_CLIENT] Initialized Groq client using model: {self._model}")
            except Exception as e:
                logger.error(f"[AI_CLIENT] Failed to initialize Groq client: {e}")
        # Priority 2: DeepSeek
        elif deepseek_key:
            self._provider = 'deepseek'
            self._model = os.environ.get('DEEPSEEK_MODEL', 'deepseek-chat')
            try:
                from openai import OpenAI
                base_url = os.environ.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1')
                self._client = OpenAI(api_key=deepseek_key, base_url=base_url)
                logger.info(f"[AI_CLIENT] Initialized DeepSeek client using model: {self._model} and base URL: {base_url}")
            except Exception as e:
                logger.error(f"[AI_CLIENT] Failed to initialize DeepSeek client: {e}")
        else:
            logger.warning("[AI_CLIENT] No Groq (GROQ_API_KEY) or DeepSeek (DEEPSEEK_API_KEY) found in environment.")
            
        self._initialized = True

    @property
    def provider(self) -> Optional[str]:
        self._initialize()
        return self._provider

    @property
    def model(self) -> Optional[str]:
        self._initialize()
        return self._model

    @property
    def client(self) -> Optional[Any]:
        self._initialize()
        return self._client

# Singleton client instance
ai_client_wrapper = AIClientWrapper()

