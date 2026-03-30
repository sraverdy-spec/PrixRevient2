"""
Test Settings, Crontabs, Dashboard, CostsTable and Excel Export features
Tests for iteration 4 - Settings page with tabs, Excel export, Dashboard charts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSettingsFeatures:
    """Test Settings API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.admin_data = login_resp.json()
        yield
    
    # ===== SETTINGS ENDPOINTS =====
    
    def test_get_settings(self):
        """GET /api/settings - should return app settings"""
        resp = self.session.get(f"{BASE_URL}/api/settings")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        # Verify settings structure
        assert "primary_color" in data
        assert "secondary_color" in data
        assert "accent_color" in data
        assert "company_name" in data
        assert "sidebar_bg" in data
        assert "sso_enabled" in data
        print(f"✓ GET /api/settings - returned settings with company_name: {data.get('company_name')}")
    
    def test_update_settings(self):
        """PUT /api/settings - admin can update settings"""
        # Get current settings
        current = self.session.get(f"{BASE_URL}/api/settings").json()
        
        # Update with new values
        update_data = {
            "company_name": "Test Company Updated",
            "primary_color": "#FF0000",
            "secondary_color": "#00FF00",
            "accent_color": "#0000FF",
            "danger_color": "#FF0000",
            "sidebar_bg": "#FFFFFF",
            "sidebar_active_bg": "#FF0000",
            "sidebar_active_text": "#FFFFFF",
            "sso_enabled": False
        }
        resp = self.session.put(f"{BASE_URL}/api/settings", json=update_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        # Verify update
        updated = resp.json()
        assert updated["company_name"] == "Test Company Updated"
        assert updated["primary_color"] == "#FF0000"
        print("✓ PUT /api/settings - settings updated successfully")
        
        # Restore original
        restore_data = {
            "company_name": current.get("company_name", "PrixRevient"),
            "primary_color": current.get("primary_color", "#002FA7"),
            "secondary_color": current.get("secondary_color", "#10B981"),
            "accent_color": current.get("accent_color", "#F59E0B"),
            "danger_color": current.get("danger_color", "#EF4444"),
            "sidebar_bg": current.get("sidebar_bg", "#F4F4F5"),
            "sidebar_active_bg": current.get("sidebar_active_bg", "#002FA7"),
            "sidebar_active_text": current.get("sidebar_active_text", "#FFFFFF"),
            "sso_enabled": current.get("sso_enabled", False)
        }
        self.session.put(f"{BASE_URL}/api/settings", json=restore_data)
        print("✓ Settings restored to original values")
    
    def test_settings_sso_toggle(self):
        """PUT /api/settings - can toggle SSO settings"""
        # Enable SSO
        resp = self.session.put(f"{BASE_URL}/api/settings", json={
            "sso_enabled": True,
            "sso_provider": "google",
            "sso_client_id": "test-client-id",
            "sso_domain": "test.example.com"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["sso_enabled"] == True
        assert data["sso_provider"] == "google"
        print("✓ SSO settings can be enabled and configured")
        
        # Disable SSO
        resp = self.session.put(f"{BASE_URL}/api/settings", json={"sso_enabled": False})
        assert resp.status_code == 200
        assert resp.json()["sso_enabled"] == False
        print("✓ SSO settings can be disabled")


class TestCrontabsFeatures:
    """Test Crontabs (scheduled tasks) API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        yield
    
    def test_get_crontabs(self):
        """GET /api/crontabs - admin can list scheduled tasks"""
        resp = self.session.get(f"{BASE_URL}/api/crontabs")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/crontabs - returned {len(data)} crontabs")
    
    def test_create_crontab(self):
        """POST /api/crontabs - admin can create scheduled task"""
        cron_data = {
            "name": "TEST_Import SFTP quotidien",
            "type": "sftp_scan",
            "schedule": "0 8 * * *",
            "enabled": True
        }
        resp = self.session.post(f"{BASE_URL}/api/crontabs", json=cron_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data["name"] == "TEST_Import SFTP quotidien"
        assert data["type"] == "sftp_scan"
        assert data["schedule"] == "0 8 * * *"
        assert data["enabled"] == True
        assert "id" in data
        self.created_cron_id = data["id"]
        print(f"✓ POST /api/crontabs - created crontab with id: {data['id']}")
        return data["id"]
    
    def test_update_crontab(self):
        """PUT /api/crontabs/{id} - admin can update scheduled task"""
        # First create a crontab
        cron_id = self.test_create_crontab()
        
        # Update it
        resp = self.session.put(f"{BASE_URL}/api/crontabs/{cron_id}", json={
            "enabled": False
        })
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data["enabled"] == False
        print(f"✓ PUT /api/crontabs/{cron_id} - crontab disabled")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/crontabs/{cron_id}")
    
    def test_run_crontab(self):
        """POST /api/crontabs/{id}/run - admin can run task manually"""
        # First create a crontab
        cron_data = {
            "name": "TEST_Manual run test",
            "type": "sftp_scan",
            "schedule": "*/30 * * * *",
            "enabled": True
        }
        create_resp = self.session.post(f"{BASE_URL}/api/crontabs", json=cron_data)
        cron_id = create_resp.json()["id"]
        
        # Run it manually
        resp = self.session.post(f"{BASE_URL}/api/crontabs/{cron_id}/run")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        print(f"✓ POST /api/crontabs/{cron_id}/run - task executed manually")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/crontabs/{cron_id}")
    
    def test_delete_crontab(self):
        """DELETE /api/crontabs/{id} - admin can delete scheduled task"""
        # First create a crontab
        cron_data = {
            "name": "TEST_To be deleted",
            "type": "sftp_scan",
            "schedule": "*/15 * * * *",
            "enabled": False
        }
        create_resp = self.session.post(f"{BASE_URL}/api/crontabs", json=cron_data)
        cron_id = create_resp.json()["id"]
        
        # Delete it
        resp = self.session.delete(f"{BASE_URL}/api/crontabs/{cron_id}")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        print(f"✓ DELETE /api/crontabs/{cron_id} - crontab deleted")
        
        # Verify deletion
        list_resp = self.session.get(f"{BASE_URL}/api/crontabs")
        crontabs = list_resp.json()
        assert not any(c["id"] == cron_id for c in crontabs)
        print("✓ Verified crontab no longer exists")


class TestDashboardFeatures:
    """Test Dashboard API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        yield
    
    def test_dashboard_stats(self):
        """GET /api/dashboard/stats - returns dashboard statistics"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Verify stats structure
        assert "total_materials" in data
        assert "total_recipes" in data
        assert "total_overheads" in data
        assert "total_suppliers" in data
        assert "avg_cost_per_unit" in data
        assert "recent_recipes" in data
        
        print(f"✓ GET /api/dashboard/stats - materials: {data['total_materials']}, recipes: {data['total_recipes']}")
    
    def test_reports_all_costs_for_charts(self):
        """GET /api/reports/all-costs - returns all costs for dashboard charts"""
        resp = self.session.get(f"{BASE_URL}/api/reports/all-costs")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/reports/all-costs - returned {len(data)} cost records for charts")


class TestCostsTableFeatures:
    """Test Costs Table and Excel Export features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        yield
    
    def test_reports_all_costs(self):
        """GET /api/reports/all-costs - returns all costs for table"""
        resp = self.session.get(f"{BASE_URL}/api/reports/all-costs")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            # Verify cost structure
            cost = data[0]
            assert "recipe_id" in cost
            assert "recipe_name" in cost
            assert "material_cost" in cost
            assert "labor_cost" in cost
            assert "overhead_cost" in cost
            assert "total_cost" in cost
            assert "cost_per_unit" in cost
            assert "suggested_price" in cost
            print(f"✓ GET /api/reports/all-costs - returned {len(data)} recipes with costs")
        else:
            print("✓ GET /api/reports/all-costs - returned empty list (no recipes)")
    
    def test_export_excel(self):
        """GET /api/reports/export-excel - exports costs as XLSX file"""
        resp = self.session.get(f"{BASE_URL}/api/reports/export-excel")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        # Verify it's an Excel file
        content_type = resp.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        # Verify content disposition header
        content_disp = resp.headers.get("content-disposition", "")
        assert "attachment" in content_disp
        assert ".xlsx" in content_disp
        
        # Verify file has content
        assert len(resp.content) > 0
        print(f"✓ GET /api/reports/export-excel - returned XLSX file ({len(resp.content)} bytes)")


class TestOperatorRestrictions:
    """Test that operator cannot access admin-only endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with operator authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "operator@example.com",
            "password": "Operator123!"
        })
        assert login_resp.status_code == 200
        yield
    
    def test_operator_cannot_update_settings(self):
        """PUT /api/settings - operator should get 403"""
        resp = self.session.put(f"{BASE_URL}/api/settings", json={
            "company_name": "Hacked"
        })
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("✓ Operator cannot update settings (403)")
    
    def test_operator_cannot_access_crontabs(self):
        """GET /api/crontabs - operator should get 403"""
        resp = self.session.get(f"{BASE_URL}/api/crontabs")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("✓ Operator cannot access crontabs (403)")
    
    def test_operator_can_read_settings(self):
        """GET /api/settings - operator can read settings (for UI colors)"""
        resp = self.session.get(f"{BASE_URL}/api/settings")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print("✓ Operator can read settings (200)")
    
    def test_operator_can_read_costs(self):
        """GET /api/reports/all-costs - operator can read costs table"""
        resp = self.session.get(f"{BASE_URL}/api/reports/all-costs")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print("✓ Operator can read costs table (200)")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        yield
    
    def test_cleanup_test_crontabs(self):
        """Cleanup any TEST_ prefixed crontabs"""
        resp = self.session.get(f"{BASE_URL}/api/crontabs")
        if resp.status_code == 200:
            crontabs = resp.json()
            for cron in crontabs:
                if cron.get("name", "").startswith("TEST_"):
                    self.session.delete(f"{BASE_URL}/api/crontabs/{cron['id']}")
                    print(f"✓ Cleaned up crontab: {cron['name']}")
        print("✓ Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
