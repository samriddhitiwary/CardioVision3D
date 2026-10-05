import asyncio
import logging
from google import genai
from google.genai import types
from pydantic import ValidationError

from backend.app.core.config import get_settings
from backend.app.schemas.risk_story import RiskStoryResponse

logger = logging.getLogger(__name__)


class GeminiRiskStoryClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = genai.Client(api_key=self.settings.gemini_api_key)
        self.primary_model = self.settings.risk_story_model
        
        # Parse fallback models from comma-separated string
        raw_fallbacks = getattr(self.settings, "risk_story_fallback_models", "")
        self.fallback_models = [m.strip() for m in raw_fallbacks.split(",") if m.strip()]
        
        self.all_models = [self.primary_model] + self.fallback_models
        
        # Stateful tracker to remember which model is currently failing
        self.current_model_idx = 0
        
    async def generate(self, prompt: str) -> RiskStoryResponse:
        # Pick the model based on the current state index
        model = self.all_models[self.current_model_idx]
        
        try:
            # No timeout, no retries, just a single natural call
            return await self._generate_with_model(model, prompt)
            
        except Exception as e:
            logger.warning(f"Model {model} failed: {e}. Switching to next model for future requests.")
            
            # Increment the index so the NEXT application request uses the next model
            self.current_model_idx = (self.current_model_idx + 1) % len(self.all_models)
            
            # Raise the exception so the current request falls back to the deterministic story
            raise e

    async def _generate_with_model(self, model_name: str, prompt: str) -> RiskStoryResponse:
        logger.debug(f"Generating Risk Story using {model_name}")
        
        response = await self.client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RiskStoryResponse,
                temperature=0.2,
            ),
        )
        
        return RiskStoryResponse.model_validate_json(response.text)
