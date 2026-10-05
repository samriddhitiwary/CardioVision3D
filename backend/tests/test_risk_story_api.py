import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock

from backend.app.main import app
from backend.app.db.models import Doctor, Patient
from backend.app.schemas.risk_story import RiskStoryResponse

@pytest.fixture
def mock_risk_story_service():
    with patch("backend.app.api.endpoints.risk_story.risk_story_service.generate_risk_story") as mock:
        yield mock

@pytest.fixture
def mock_prediction_services():
    with patch("backend.app.api.endpoints.risk_story.prediction_service") as mock_pred, \
         patch("backend.app.api.endpoints.risk_story.explanation_service") as mock_exp, \
         patch("backend.app.api.endpoints.risk_story.PatientInput") as mock_pi:
        yield mock_pred, mock_exp, mock_pi


@pytest.mark.anyio
async def test_risk_story_success(mock_risk_story_service, mock_prediction_services):
    current_user = Doctor(id=1, email="doc@test.com")
    
    patient = Patient(id=1, doctor_id=1, clinical_data={"age": 60})
    db_mock = MagicMock()
    db_mock.query().filter().first.return_value = patient
    
    mock_pred, mock_exp, mock_pi = mock_prediction_services
    
    mock_response = RiskStoryResponse(
        headline="Test",
        summary="Test",
        primary_message="Test",
        positive_factors=[],
        negative_factors=[],
        vessels=[],
        visualization_steps=[],
        disclaimer="Test"
    )
    mock_risk_story_service.return_value = mock_response
    
    # Needs to bypass the normal Dependency overrides for testing if not using FastAPI TestClient overrides
    # To keep it simple, we use app.dependency_overrides
    from backend.app.api.deps import get_current_user, get_db
    from backend.app.api.predictions import prediction_service, explanation_service
    app.dependency_overrides[get_current_user] = lambda: current_user
    app.dependency_overrides[get_db] = lambda: db_mock
    app.dependency_overrides[prediction_service] = lambda: mock_pred
    app.dependency_overrides[explanation_service] = lambda: mock_exp
    
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/patients/1/risk-story", json={"force_regenerate": False})
        
    assert response.status_code == 200
    assert response.json()["headline"] == "Test"
    app.dependency_overrides = {}


@pytest.mark.anyio
async def test_risk_story_unauthorized():
    # No auth override
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/patients/1/risk-story", json={"force_regenerate": False})
        
    assert response.status_code == 401


@pytest.mark.anyio
async def test_risk_story_not_owned_patient():
    current_user = Doctor(id=1)
    
    # Patient belongs to doctor 2
    patient = Patient(id=1, doctor_id=2, clinical_data={"age": 60})
    db_mock = MagicMock()
    db_mock.query().filter().first.return_value = patient
    
    from backend.app.api.deps import get_current_user, get_db
    from backend.app.api.predictions import prediction_service, explanation_service
    app.dependency_overrides[get_current_user] = lambda: current_user
    app.dependency_overrides[get_db] = lambda: db_mock
    app.dependency_overrides[prediction_service] = lambda: MagicMock()
    app.dependency_overrides[explanation_service] = lambda: MagicMock()
    
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/patients/1/risk-story", json={})
        
    assert response.status_code == 404
    app.dependency_overrides = {}


@pytest.mark.anyio
async def test_risk_story_no_clinical_data():
    current_user = Doctor(id=1)
    patient = Patient(id=1, doctor_id=1, clinical_data=None)
    db_mock = MagicMock()
    db_mock.query().filter().first.return_value = patient
    
    from backend.app.api.deps import get_current_user, get_db
    from backend.app.api.predictions import prediction_service, explanation_service
    app.dependency_overrides[get_current_user] = lambda: current_user
    app.dependency_overrides[get_db] = lambda: db_mock
    app.dependency_overrides[prediction_service] = lambda: MagicMock()
    app.dependency_overrides[explanation_service] = lambda: MagicMock()
    
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/patients/1/risk-story", json={})
        
    assert response.status_code == 400
    assert "no clinical data" in response.text
    app.dependency_overrides = {}
