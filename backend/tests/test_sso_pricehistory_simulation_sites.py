"""
Test SSO, Price History, Simulation (What-If), and Sites Management endpoints
Tests for iteration 7 features:
- SSO status and URL endpoints
- Price history recording and retrieval
- What-if simulation for material price changes
- Multi-site management CRUD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin123!"
MANAGER_EMAIL = "manager@example.com"
MANAGER_PASSWORD = "Manager123!"
OPERATOR_EMAIL = "operator@example.com"
OPERATOR_PASSWORD = "Operator123!"


@pytest.fixture(scope="module")
def admin_session():
    """Get authenticated admin session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return session


@pytest.fixture(scope="module")
def manager_session():
    """Get authenticated manager session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": MANAGER_EMAIL,
        "password": MANAGER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Manager login failed: {response.text}")
    return session


@pytest.fixture(scope="module")
def operator_session():
    """Get authenticated operator session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": OPERATOR_EMAIL,
        "password": OPERATOR_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Operator login failed: {response.text}")
    return session


class TestSSOEndpoints:
    """Test SSO status and URL endpoints"""
    
    def test_sso_status_returns_disabled(self):
        """GET /api/auth/sso/status returns google_enabled:false and microsoft_enabled:false"""
        response = requests.get(f"{BASE_URL}/api/auth/sso/status")
        assert response.status_code == 200
        data = response.json()
        assert "google_enabled" in data
        assert "microsoft_enabled" in data
        # SSO is not configured by default
        assert data["google_enabled"] == False
        assert data["microsoft_enabled"] == False
        print(f"SSO status: {data}")
    
    def test_google_sso_url_returns_400_when_not_configured(self):
        """GET /api/auth/sso/google/url returns 400 when SSO not configured"""
        response = requests.get(f"{BASE_URL}/api/auth/sso/google/url")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Google SSO URL response: {data}")
    
    def test_microsoft_sso_url_returns_400_when_not_configured(self):
        """GET /api/auth/sso/microsoft/url returns 400 when SSO not configured"""
        response = requests.get(f"{BASE_URL}/api/auth/sso/microsoft/url")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Microsoft SSO URL response: {data}")


class TestPriceHistoryEndpoints:
    """Test price history recording and retrieval"""
    
    def test_record_price_history_requires_auth(self):
        """POST /api/price-history/record requires authentication"""
        response = requests.post(f"{BASE_URL}/api/price-history/record")
        assert response.status_code == 401
    
    def test_record_price_history_as_manager(self, manager_session):
        """POST /api/price-history/record records price history for all recipes"""
        response = manager_session.post(f"{BASE_URL}/api/price-history/record")
        assert response.status_code == 200
        data = response.json()
        assert "recorded" in data
        assert isinstance(data["recorded"], int)
        print(f"Recorded {data['recorded']} recipe price history entries")
    
    def test_get_price_history(self, manager_session):
        """GET /api/price-history returns price history entries"""
        response = manager_session.get(f"{BASE_URL}/api/price-history")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Retrieved {len(data)} price history entries")
        if data:
            entry = data[0]
            assert "recipe_id" in entry
            assert "recipe_name" in entry
            assert "cost_per_unit" in entry
            assert "recorded_at" in entry
    
    def test_record_material_prices_as_manager(self, manager_session):
        """POST /api/price-history/materials/record records material prices"""
        response = manager_session.post(f"{BASE_URL}/api/price-history/materials/record")
        assert response.status_code == 200
        data = response.json()
        assert "recorded" in data
        assert isinstance(data["recorded"], int)
        print(f"Recorded {data['recorded']} material price history entries")
    
    def test_get_price_alerts(self, manager_session):
        """GET /api/price-history/alerts returns alerts list"""
        response = manager_session.get(f"{BASE_URL}/api/price-history/alerts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Retrieved {len(data)} price alerts")


class TestSimulationWhatIf:
    """Test what-if simulation endpoint"""
    
    @pytest.fixture(scope="class")
    def material_id(self, manager_session):
        """Get a material ID for testing"""
        response = manager_session.get(f"{BASE_URL}/api/materials")
        if response.status_code != 200:
            pytest.skip("Could not get materials")
        materials = response.json()
        if not materials:
            pytest.skip("No materials in database")
        return materials[0]["id"]
    
    def test_simulation_what_if_returns_results(self, manager_session, material_id):
        """POST /api/simulation/what-if returns simulation results with impacts"""
        response = manager_session.post(f"{BASE_URL}/api/simulation/what-if", json={
            "material_id": material_id,
            "price_change_pct": 10
        })
        assert response.status_code == 200
        data = response.json()
        assert "material_name" in data
        assert "original_price" in data
        assert "new_price" in data
        assert "price_change_pct" in data
        assert "impacted_recipes" in data
        assert "impacts" in data
        assert isinstance(data["impacts"], list)
        print(f"Simulation result: {data['material_name']} +10% -> {data['impacted_recipes']} recipes impacted")
    
    def test_simulation_what_if_with_invalid_material_returns_404(self, manager_session):
        """POST /api/simulation/what-if with invalid material_id returns 404"""
        response = manager_session.post(f"{BASE_URL}/api/simulation/what-if", json={
            "material_id": "invalid-material-id-12345",
            "price_change_pct": 10
        })
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print(f"Invalid material response: {data}")
    
    def test_simulation_what_if_without_material_id_returns_400(self, manager_session):
        """POST /api/simulation/what-if without material_id returns 400"""
        response = manager_session.post(f"{BASE_URL}/api/simulation/what-if", json={
            "price_change_pct": 10
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Missing material_id response: {data}")


class TestSitesManagement:
    """Test multi-site management CRUD"""
    
    def test_get_sites_returns_default_site(self, admin_session):
        """GET /api/sites returns default site (auto-seeded)"""
        response = admin_session.get(f"{BASE_URL}/api/sites")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Check for default site
        default_sites = [s for s in data if s.get("is_default")]
        assert len(default_sites) >= 1
        print(f"Sites: {data}")
    
    def test_create_site_as_admin(self, admin_session):
        """POST /api/sites creates a new site"""
        response = admin_session.post(f"{BASE_URL}/api/sites", json={
            "name": "TEST_Site Nord",
            "address": "123 Rue du Test, 59000 Lille"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Site Nord"
        assert data["address"] == "123 Rue du Test, 59000 Lille"
        assert data["is_default"] == False
        assert "id" in data
        print(f"Created site: {data}")
        return data["id"]
    
    def test_update_site_as_admin(self, admin_session):
        """PUT /api/sites/{id} updates a site"""
        # First create a site
        create_response = admin_session.post(f"{BASE_URL}/api/sites", json={
            "name": "TEST_Site Update",
            "address": "Old Address"
        })
        assert create_response.status_code == 200
        site_id = create_response.json()["id"]
        
        # Update the site
        update_response = admin_session.put(f"{BASE_URL}/api/sites/{site_id}", json={
            "name": "TEST_Site Updated",
            "address": "New Address 456"
        })
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["name"] == "TEST_Site Updated"
        assert data["address"] == "New Address 456"
        print(f"Updated site: {data}")
    
    def test_delete_non_default_site(self, admin_session):
        """DELETE /api/sites/{id} deletes a non-default site"""
        # First create a site
        create_response = admin_session.post(f"{BASE_URL}/api/sites", json={
            "name": "TEST_Site Delete",
            "address": "To be deleted"
        })
        assert create_response.status_code == 200
        site_id = create_response.json()["id"]
        
        # Delete the site
        delete_response = admin_session.delete(f"{BASE_URL}/api/sites/{site_id}")
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "message" in data
        print(f"Deleted site: {data}")
        
        # Verify deletion
        get_response = admin_session.get(f"{BASE_URL}/api/sites")
        sites = get_response.json()
        site_ids = [s["id"] for s in sites]
        assert site_id not in site_ids
    
    def test_delete_default_site_returns_400(self, admin_session):
        """DELETE /api/sites/default returns 400 (cannot delete default)"""
        response = admin_session.delete(f"{BASE_URL}/api/sites/default")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Delete default site response: {data}")
    
    def test_create_site_requires_admin(self, operator_session):
        """POST /api/sites requires admin role"""
        response = operator_session.post(f"{BASE_URL}/api/sites", json={
            "name": "TEST_Unauthorized Site",
            "address": "Should fail"
        })
        assert response.status_code == 403
        print("Operator correctly denied site creation")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_sites(self, admin_session):
        """Remove TEST_ prefixed sites"""
        response = admin_session.get(f"{BASE_URL}/api/sites")
        if response.status_code == 200:
            sites = response.json()
            for site in sites:
                if site.get("name", "").startswith("TEST_"):
                    admin_session.delete(f"{BASE_URL}/api/sites/{site['id']}")
                    print(f"Cleaned up site: {site['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
