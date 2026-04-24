"""
Pytest configuration and shared fixtures for ML service tests.
"""
import pytest
import sys
import os

# Add the parent directory to the path so we can import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="session")
def test_data_dir():
    """Return path to test data directory"""
    return os.path.join(os.path.dirname(__file__), "test_data")


@pytest.fixture
def mock_decision():
    """Return a mock decision object for testing"""
    return {
        "_id": "test-decision-123",
        "decisionId": "D2026-001",
        "department": "OP001",
        "status": "approved",
        "cycleTimeHours": 24.5,
        "rejectionCount": 0,
        "revisionCount": 1,
        "daysOverSLA": 0,
        "stageCount": 4,
        "hourOfDaySubmitted": 10,
        "createdAt": "2026-04-22T10:00:00Z"
    }


@pytest.fixture
def mock_anomaly_result():
    """Return a mock anomaly result"""
    return {
        "id": "test-anomaly-456",
        "anomalyScore": 0.75,
        "isAnomaly": True,
        "severity": "High"
    }


@pytest.fixture
def mock_risk_result():
    """Return a mock risk result"""
    return {
        "riskScore": 65,
        "riskLevel": "Medium",
        "featureImportance": {
            "revisionCount": 0.35,
            "stageCount": 0.25,
            "avgCycleTimeHours": 0.25,
            "hourOfDaySubmitted": 0.15
        }
    }
