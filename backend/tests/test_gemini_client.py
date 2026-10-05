import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from pydantic import ValidationError

from backend.app.integrations.gemini_client import GeminiRiskStoryClient
from backend.app.schemas.risk_story import RiskStoryResponse

@pytest.fixture
def mock_settings():
    with patch('app.integrations.gemini_client.get_settings') as mock:
        settings = MagicMock()
        settings.gemini_api_key = "test"
        settings.risk_story_model = "test-model"
        mock.return_value = settings
        yield mock


@pytest.mark.anyio
async def test_generate_success(mock_settings):
    valid_json = '{"headline": "test", "summary": "test", "primary_message": "test", "positive_factors": [], "negative_factors": [], "vessels": [], "visualization_steps": [], "disclaimer": "test"}'
    
    with patch('app.integrations.gemini_client.genai.Client') as mock_client_class:
        mock_client = MagicMock()
        mock_aio = MagicMock()
        mock_models = MagicMock()
        
        mock_response = MagicMock()
        mock_response.text = valid_json
        
        mock_models.generate_content = AsyncMock(return_value=mock_response)
        mock_aio.models = mock_models
        mock_client.aio = mock_aio
        mock_client_class.return_value = mock_client
        
        client = GeminiRiskStoryClient()
        response = await client.generate("test prompt")
        
        assert isinstance(response, RiskStoryResponse)
        assert response.headline == "test"
        mock_models.generate_content.assert_called_once()


@pytest.mark.anyio
async def test_generate_fails_fast_on_validation_error(mock_settings):
    """Test that a Pydantic validation error does NOT trigger retries, and raises immediately."""
    invalid_json = '{"headline": "test"}' # Missing required fields
    
    with patch('app.integrations.gemini_client.genai.Client') as mock_client_class:
        mock_client = MagicMock()
        mock_aio = MagicMock()
        mock_models = MagicMock()
        
        mock_response = MagicMock()
        mock_response.text = invalid_json
        
        mock_models.generate_content = AsyncMock(return_value=mock_response)
        mock_aio.models = mock_models
        mock_client.aio = mock_aio
        mock_client_class.return_value = mock_client
        
        client = GeminiRiskStoryClient()
        
        with pytest.raises(ValidationError):
            await client.generate("test prompt")
            
        # Should only be called once, because ValidationError is not retryable
        assert mock_models.generate_content.call_count == 1


@pytest.mark.anyio
async def test_generate_retries_on_transient_error(mock_settings):
    """Test that arbitrary network/API errors fail fast with single call and rotate model index."""
    with patch('app.integrations.gemini_client.genai.Client') as mock_client_class:
        mock_client = MagicMock()
        mock_aio = MagicMock()
        mock_models = MagicMock()
        
        mock_models.generate_content = AsyncMock(side_effect=Exception("Transient API Error"))
        mock_aio.models = mock_models
        mock_client.aio = mock_aio
        mock_client_class.return_value = mock_client
        
        client = GeminiRiskStoryClient()
        initial_idx = client.current_model_idx
        
        with pytest.raises(Exception) as exc_info:
            await client.generate("test prompt")
            
        assert str(exc_info.value) == "Transient API Error"
        assert mock_models.generate_content.call_count == 1
        # Rotated to next model
        assert client.current_model_idx == (initial_idx + 1) % len(client.all_models)

