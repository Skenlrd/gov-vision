import pytest
import pandas as pd
from datetime import datetime, timedelta
from app.services.forecast_service import ForecastService


class TestForecastService:
    """Tests for the Prophet Forecasting Service"""
    
    @pytest.fixture
    def sample_time_series(self):
        """Generate sample time series data"""
        dates = pd.date_range(start='2026-01-01', periods=90, freq='D')
        values = [50 + i * 0.5 + (10 if i % 7 < 5 else 0) for i in range(90)]
        
        return pd.DataFrame({
            'ds': dates,
            'y': values
        })
    
    @pytest.fixture
    def forecast_service(self):
        """Create forecast service instance"""
        return ForecastService()
    
    def test_service_initialization(self, forecast_service):
        """Test that the forecast service initializes correctly"""
        assert forecast_service is not None
    
    def test_generate_forecast(self, forecast_service, sample_time_series):
        """Test forecast generation"""
        forecast = forecast_service.generate_forecast(
            data=sample_time_series,
            horizon=30,
            target='volume'
        )
        
        assert isinstance(forecast, list)
        assert len(forecast) == 30
        
        for point in forecast:
            assert 'ds' in point  # Date
            assert 'yhat' in point  # Prediction
            assert 'yhat_lower' in point  # Lower bound
            assert 'yhat_upper' in point  # Upper bound
            
            # Bounds should be logical
            assert point['yhat_lower'] <= point['yhat'] <= point['yhat_upper']
    
    def test_forecast_different_targets(self, forecast_service, sample_time_series):
        """Test forecasting different targets"""
        targets = ['volume', 'delay', 'approval_rate', 'rejection_rate']
        
        for target in targets:
            forecast = forecast_service.generate_forecast(
                data=sample_time_series,
                horizon=14,
                target=target
            )
            
            assert len(forecast) == 14
            assert all('yhat' in point for point in forecast)
    
    def test_forecast_with_insufficient_data(self, forecast_service):
        """Test handling of insufficient data"""
        # Less than 2 data points
        small_data = pd.DataFrame({
            'ds': [datetime.now()],
            'y': [50]
        })
        
        with pytest.raises(ValueError):
            forecast_service.generate_forecast(
                data=small_data,
                horizon=30,
                target='volume'
            )
    
    def test_forecast_horizon_limits(self, forecast_service, sample_time_series):
        """Test forecast horizon boundaries"""
        # Test minimum horizon
        forecast_min = forecast_service.generate_forecast(
            data=sample_time_series,
            horizon=1,
            target='volume'
        )
        assert len(forecast_min) == 1
        
        # Test maximum horizon (90 days)
        forecast_max = forecast_service.generate_forecast(
            data=sample_time_series,
            horizon=90,
            target='volume'
        )
        assert len(forecast_max) == 90


class TestDataPreparation:
    """Tests for data preparation utilities"""
    
    def test_prepare_volume_data(self):
        """Test preparation of volume data from decisions"""
        from app.services.forecast_service import prepare_volume_data
        
        decisions = [
            {'createdAt': datetime(2026, 4, 1), 'status': 'approved'},
            {'createdAt': datetime(2026, 4, 1), 'status': 'approved'},
            {'createdAt': datetime(2026, 4, 2), 'status': 'rejected'},
        ]
        
        df = prepare_volume_data(decisions)
        
        assert isinstance(df, pd.DataFrame)
        assert 'ds' in df.columns
        assert 'y' in df.columns
        assert len(df) == 2  # Two unique dates
    
    def test_prepare_delay_data(self):
        """Test preparation of delay data"""
        from app.services.forecast_service import prepare_delay_data
        
        decisions = [
            {'createdAt': datetime(2026, 4, 1), 'cycleTimeHours': 24},
            {'createdAt': datetime(2026, 4, 1), 'cycleTimeHours': 48},
            {'createdAt': datetime(2026, 4, 2), 'cycleTimeHours': 12},
        ]
        
        df = prepare_delay_data(decisions)
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) == 2
        # Average delay for 2026-04-01 should be 36 hours
        first_row = df.iloc[0]
        assert first_row['y'] == 36.0
