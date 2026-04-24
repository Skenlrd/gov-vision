import pytest
import numpy as np
from app.services.anomaly_service import AnomalyService


class TestAnomalyService:
    """Tests for the Anomaly Detection Service"""
    
    @pytest.fixture
    def sample_decisions(self):
        """Generate sample decision data for testing"""
        return [
            {
                "cycleTimeHours": 24.0,
                "rejectionCount": 0,
                "revisionCount": 1,
                "daysOverSLA": 0,
                "stageCount": 4,
                "hourOfDaySubmitted": 9
            },
            {
                "cycleTimeHours": 120.0,
                "rejectionCount": 2,
                "revisionCount": 5,
                "daysOverSLA": 3,
                "stageCount": 8,
                "hourOfDaySubmitted": 14
            },
            {
                "cycleTimeHours": 48.0,
                "rejectionCount": 0,
                "revisionCount": 2,
                "daysOverSLA": 0,
                "stageCount": 5,
                "hourOfDaySubmitted": 10
            }
        ]
    
    def test_service_initialization(self):
        """Test that the anomaly service can be initialized"""
        service = AnomalyService()
        assert service.model is not None
    
    def test_predict_single(self, sample_decisions):
        """Test single prediction"""
        service = AnomalyService()
        decision = sample_decisions[0]
        
        result = service.predict(decision)
        
        assert "anomalyScore" in result
        assert "isAnomaly" in result
        assert "severity" in result
        assert 0 <= result["anomalyScore"] <= 1
        assert isinstance(result["isAnomaly"], bool)
    
    def test_predict_batch(self, sample_decisions):
        """Test batch prediction"""
        service = AnomalyService()
        
        results = service.predict_batch(sample_decisions)
        
        assert len(results) == len(sample_decisions)
        for result in results:
            assert "id" in result
            assert "anomalyScore" in result
            assert "isAnomaly" in result
            assert "severity" in result
    
    def test_high_anomaly_detection(self):
        """Test that extreme values are flagged as anomalies"""
        service = AnomalyService()
        
        # Extreme case that should definitely be an anomaly
        extreme_decision = {
            "cycleTimeHours": 500.0,
            "rejectionCount": 10,
            "revisionCount": 20,
            "daysOverSLA": 15,
            "stageCount": 20,
            "hourOfDaySubmitted": 2  # Middle of night
        }
        
        result = service.predict(extreme_decision)
        
        # Should have high anomaly score
        assert result["anomalyScore"] > 0.5
        assert result["isAnomaly"] is True
    
    def test_normal_decision_not_anomaly(self):
        """Test that normal decisions are not flagged"""
        service = AnomalyService()
        
        # Normal decision
        normal_decision = {
            "cycleTimeHours": 20.0,
            "rejectionCount": 0,
            "revisionCount": 1,
            "daysOverSLA": 0,
            "stageCount": 3,
            "hourOfDaySubmitted": 10
        }
        
        result = service.predict(normal_decision)
        
        # Should have low anomaly score
        assert result["anomalyScore"] < 0.5
        assert result["isAnomaly"] is False
    
    def test_invalid_input_handling(self):
        """Test handling of invalid input"""
        service = AnomalyService()
        
        # Missing required fields
        invalid_decision = {
            "cycleTimeHours": 24.0
            # Missing other required fields
        }
        
        with pytest.raises(Exception):
            service.predict(invalid_decision)


class TestFeatureExtraction:
    """Tests for feature extraction from decisions"""
    
    def test_extract_features(self):
        """Test feature extraction from raw decision data"""
        from app.services.anomaly_service import extract_features
        
        raw_decision = {
            "cycleTimeHours": 48.5,
            "rejectionCount": 1,
            "revisionCount": 3,
            "daysOverSLA": 1,
            "stageCount": 6,
            "hourOfDaySubmitted": 14,
            "extraField": "ignored"  # Should be ignored
        }
        
        features = extract_features(raw_decision)
        
        assert len(features) == 4  # Only the 4 key features
        assert features[0] == 48.5  # cycleTimeHours
        assert features[1] == 1     # rejectionCount
        assert features[2] == 3     # revisionCount
        assert features[3] == 1     # daysOverSLA
