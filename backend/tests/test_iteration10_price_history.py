"""
Iteration 10 Tests: Price History Evolution Chart & Price Alerts
Tests for:
- GET /api/price-history?days=90 - Returns price history entries
- GET /api/price-history/alerts - Returns price alerts array
- POST /api/price-history/record - Records prices for all recipes (requires manager/admin)
- POST /api/price-history/materials/record - Records material prices (requires manager/admin)
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPriceHistoryEndpoints:
    """Test price history endpoints for dashboard evolution chart"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin to get auth cookie"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.admin_user = login_response.json()
        yield
        # Cleanup
        self.session.close()
    
    def test_get_price_history_returns_list(self):
        """GET /api/price-history?days=90 should return a list of price history entries"""
        response = self.session.get(f"{BASE_URL}/api/price-history?days=90")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there's data, verify structure
        if len(data) > 0:
            entry = data[0]
            assert "recipe_id" in entry, "Entry should have recipe_id"
            assert "recipe_name" in entry, "Entry should have recipe_name"
            assert "cost_per_unit" in entry, "Entry should have cost_per_unit"
            assert "recorded_at" in entry, "Entry should have recorded_at"
            print(f"PASS: GET /api/price-history returned {len(data)} entries")
        else:
            print("PASS: GET /api/price-history returned empty list (no history yet)")
    
    def test_get_price_history_with_recipe_filter(self):
        """GET /api/price-history?recipe_id=xxx should filter by recipe"""
        # First get all history to find a recipe_id
        all_response = self.session.get(f"{BASE_URL}/api/price-history?days=90")
        assert all_response.status_code == 200
        all_data = all_response.json()
        
        if len(all_data) > 0:
            recipe_id = all_data[0]["recipe_id"]
            filtered_response = self.session.get(f"{BASE_URL}/api/price-history?recipe_id={recipe_id}&days=90")
            assert filtered_response.status_code == 200
            filtered_data = filtered_response.json()
            
            # All entries should be for the same recipe
            for entry in filtered_data:
                assert entry["recipe_id"] == recipe_id, "Filtered entries should match recipe_id"
            print(f"PASS: GET /api/price-history with recipe_id filter returned {len(filtered_data)} entries")
        else:
            print("SKIP: No price history data to test filter")
    
    def test_get_price_alerts_returns_list(self):
        """GET /api/price-history/alerts should return a list of price alerts"""
        response = self.session.get(f"{BASE_URL}/api/price-history/alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are alerts, verify structure
        if len(data) > 0:
            alert = data[0]
            assert "material_name" in alert, "Alert should have material_name"
            assert "old_price" in alert, "Alert should have old_price"
            assert "new_price" in alert, "Alert should have new_price"
            assert "change_pct" in alert, "Alert should have change_pct"
            assert "type" in alert, "Alert should have type (hausse/baisse)"
            print(f"PASS: GET /api/price-history/alerts returned {len(data)} alerts")
        else:
            print("PASS: GET /api/price-history/alerts returned empty list (no alerts)")
    
    def test_record_price_history_requires_auth(self):
        """POST /api/price-history/record should require authentication"""
        # Use a new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.post(f"{BASE_URL}/api/price-history/record")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: POST /api/price-history/record requires authentication")
    
    def test_record_price_history_as_admin(self):
        """POST /api/price-history/record should work for admin"""
        response = self.session.post(f"{BASE_URL}/api/price-history/record")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "recorded" in data, "Response should have 'recorded' count"
        assert isinstance(data["recorded"], int), "'recorded' should be an integer"
        print(f"PASS: POST /api/price-history/record recorded {data['recorded']} recipes")
    
    def test_record_material_prices_as_admin(self):
        """POST /api/price-history/materials/record should work for admin"""
        response = self.session.post(f"{BASE_URL}/api/price-history/materials/record")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "recorded" in data, "Response should have 'recorded' count"
        assert isinstance(data["recorded"], int), "'recorded' should be an integer"
        print(f"PASS: POST /api/price-history/materials/record recorded {data['recorded']} materials")


class TestPriceHistoryAsManager:
    """Test price history endpoints with manager role"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as manager"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manager@example.com",
            "password": "Manager123!"
        })
        assert login_response.status_code == 200, f"Manager login failed: {login_response.text}"
        yield
        self.session.close()
    
    def test_record_price_history_as_manager(self):
        """POST /api/price-history/record should work for manager"""
        response = self.session.post(f"{BASE_URL}/api/price-history/record")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "recorded" in data, "Response should have 'recorded' count"
        print(f"PASS: Manager can record price history ({data['recorded']} recipes)")
    
    def test_record_material_prices_as_manager(self):
        """POST /api/price-history/materials/record should work for manager"""
        response = self.session.post(f"{BASE_URL}/api/price-history/materials/record")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "recorded" in data, "Response should have 'recorded' count"
        print(f"PASS: Manager can record material prices ({data['recorded']} materials)")


class TestPriceHistoryAsOperator:
    """Test price history endpoints with operator role (should be denied for record)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as operator"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "operator@example.com",
            "password": "Operator123!"
        })
        assert login_response.status_code == 200, f"Operator login failed: {login_response.text}"
        yield
        self.session.close()
    
    def test_operator_can_read_price_history(self):
        """GET /api/price-history should work for operator (read-only)"""
        response = self.session.get(f"{BASE_URL}/api/price-history?days=90")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Operator can read price history")
    
    def test_operator_can_read_alerts(self):
        """GET /api/price-history/alerts should work for operator (read-only)"""
        response = self.session.get(f"{BASE_URL}/api/price-history/alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Operator can read price alerts")
    
    def test_operator_cannot_record_price_history(self):
        """POST /api/price-history/record should be denied for operator"""
        response = self.session.post(f"{BASE_URL}/api/price-history/record")
        assert response.status_code == 403, f"Expected 403 for operator, got {response.status_code}"
        print("PASS: Operator cannot record price history (403 Forbidden)")
    
    def test_operator_cannot_record_material_prices(self):
        """POST /api/price-history/materials/record should be denied for operator"""
        response = self.session.post(f"{BASE_URL}/api/price-history/materials/record")
        assert response.status_code == 403, f"Expected 403 for operator, got {response.status_code}"
        print("PASS: Operator cannot record material prices (403 Forbidden)")


class TestDashboardEndpoints:
    """Test dashboard endpoints that use price history data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
        yield
        self.session.close()
    
    def test_dashboard_stats_endpoint(self):
        """GET /api/dashboard/stats should return dashboard statistics"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected fields
        assert "total_materials" in data, "Should have total_materials"
        assert "total_recipes" in data, "Should have total_recipes"
        assert "total_overheads" in data, "Should have total_overheads"
        assert "total_suppliers" in data, "Should have total_suppliers"
        print(f"PASS: Dashboard stats - {data['total_recipes']} recipes, {data['total_materials']} materials")
    
    def test_reports_all_costs_endpoint(self):
        """GET /api/reports/all-costs should return cost data for charts"""
        response = self.session.get(f"{BASE_URL}/api/reports/all-costs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            cost = data[0]
            assert "recipe_name" in cost, "Should have recipe_name"
            assert "material_cost" in cost, "Should have material_cost"
            assert "labor_cost" in cost, "Should have labor_cost"
            assert "total_cost" in cost, "Should have total_cost"
            assert "cost_per_unit" in cost, "Should have cost_per_unit"
            print(f"PASS: All costs endpoint returned {len(data)} recipes")
        else:
            print("PASS: All costs endpoint returned empty list (no recipes)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
