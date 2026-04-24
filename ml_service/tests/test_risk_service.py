import pytest
import numpy as np
from app.services.risk_service import RiskService


class TestRiskService:
    """Tests for the Risk Scoring Service"""
    
    @pytest.fixture
    def risk_service(self):
        """Create risk service instance"""
        return RiskService()
    
    @pytest.fixture
    def sample_features(self):
        """Sample feature sets for testing"""
        return {
            "low_risk": {
                "hourOfDaySubmitted": 10,
                "revisionCount": 0,
                "stageCount": 3,
                "avgCycleTimeHours": 12
            },
            "medium_risk": {
                "hourOfDaySubmitted": 15,
                "revisionCount": 2,
                "stageCount": 6,
                "avgCycleTimeHours": 48
            },
            "high_risk": {
                "hourOfDaySubmitted": 2,
                "revisionCount": 5,
                "stageCount": 12,
                "avgCycleTimeHours": 168
            }
        }
    
    def test_service_initialization(self, risk_service):
        """Test that the risk service initializes correctly"""
        assert risk_service is not None
        assert risk_service.model is not None
    
    def test_calculate_risk_score(self, risk_service, sample_features):
        """Test risk score calculation"""
        result = risk_service.calculate_risk(sample_features["low_risk"])
        
        assert "riskScore" in result
        assert "riskLevel" in result
        assert isinstance(result["riskScore"], (int, float))
        assert isinstance(result["riskLevel"], str)
        
        # Score should be 0-100
        assert 0 <= result["riskScore"] <= 100
    
    def test_risk_level_categories(self, risk_service, sample_features):
        """Test that risk levels are assigned correctly"""
        levels = []
        
        for feature_set in sample_features.values():
            result = risk_service.calculate_risk(feature_set)
            levels.append(result["riskLevel"])
            
            # Valid levels
            assert result["riskLevel"] in ["Low", "Medium", "High", "Critical"]
        
        # Should have different risk levels for different inputs
        assert len(set(levels)) > 0
    
    def test_low_risk_scenario(self, risk_service, sample_features):
        """Test that low-risk features produce low scores"""
        result = risk_service.calculate_risk(sample_features["low_risk"])
        
        assert result["riskScore"] < 50
        assert result["riskLevel"] in ["Low", "Medium"]
    
    def test_high_risk_scenario(self, risk_service, sample_features):
        """Test that high-risk features produce high scores"""
        result = risk_service.calculate_risk(sample_features["high_risk"])
        
        assert result["riskScore"] > 50
        assert result["riskLevel"] in ["High", "Critical"]
    
    def test_feature_importance(self, risk_service, sample_features):
        """Test that feature importance is returned"""
        result = risk_service.calculate_risk(
            sample_features["medium_risk"],
            include_feature_importance=True
        )
        
        assert "featureImportance" in result
        importance = result["featureImportance"]
        
        # Should have importance for each feature
        expected_features = [
            "hourOfDaySubmitted",
            "revisionCount", 
            "stageCount",
            "avgCycleTimeHours"
        ]
        
        for feature in expected_features:
            assert feature in importance
            assert 0 <= importance[feature] <= 1
        
        # Importance values should sum to 1 (or close to it)
        total_importance = sum(importance.values())
        assert 0.99 <= total_importance <= 1.01
    
    def test_batch_risk_calculation(self, risk_service, sample_features):
        """Test batch risk calculation"""
        features_list = list(sample_features.values())
        
        results = risk_service.calculate_risk_batch(features_list)
        
        assert len(results) == len(features_list)
        
        for result in results:
            assert "riskScore" in result
            assert "riskLevel" in result
            assert 0 <= result["riskScore"] <= 100
    
    def test_invalid_feature_handling(self, risk_service):
        """Test handling of invalid/missing features"""
        invalid_features = {
            "hourOfDaySubmitted": 10
            # Missing other required features
        }
        
        with pytest.raises(Exception):
            risk_service.calculate_risk(invalid_features)
    
    def test_extreme_values(self, risk_service):
        """Test handling of extreme feature values"""
        extreme = {
            "hourOfDaySubmitted": 23,
            "revisionCount": 100,
            "stageCount": 50,
            "avgCycleTimeHours": 1000
        }
        
        result = risk_service.calculate_risk(extreme)
        
        # Should still return valid result
        assert 0 <= result["riskScore"] <= 100
        assert result["riskLevel"] in ["Low", "Medium", "High", "Critical"]


class TestRiskThresholds:
    """Tests for risk threshold boundaries"""
    
    def test_risk_level_boundaries(self):
        """Test that risk levels map correctly to score ranges"""
        from app.services.risk_service import get_risk_level
        
        test_cases = [
            (0, "Low"),
            (25, "Low"),
            (40, "Medium"),
            (50, "Medium"),
            (60, "High"),
            (75, "High"),
            (90, "Critical"),
            (100, "Critical")
        ]
        
        for score, expected_level in test_cases:
            level = get_risk_level(score)
            assert level == expected_level, f"Score {score} should be {expected_level}, got {level}"
