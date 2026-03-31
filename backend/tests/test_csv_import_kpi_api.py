"""
Test CSV Import (Suppliers/Categories) and Public KPI API with API Key Authentication
Features tested:
1. POST /api/suppliers/import-csv - Import suppliers from CSV
2. GET /api/suppliers/csv-template - Get CSV template for suppliers
3. POST /api/categories/import-csv - Import categories from CSV
4. GET /api/categories/csv-template - Get CSV template for categories
5. POST /api/import/auto?import_type=suppliers - Auto import suppliers
6. POST /api/import/auto?import_type=categories - Auto import categories
7. GET /api/public/kpi/doc - Public API documentation (no auth)
8. GET /api/public/kpi/summary - KPI summary (requires API key)
9. POST /api/api-keys - Create API key (admin only)
10. GET /api/api-keys - List API keys (admin only)
11. DELETE /api/api-keys/{id} - Delete API key
12. PUT /api/api-keys/{id}/toggle - Toggle API key active status
13. GET /api/public/kpi/costs - Costs data with optional filters
14. GET /api/public/kpi/materials - Materials data
15. GET /api/public/kpi/recipes - Recipes data
16. GET /api/public/kpi/suppliers - Suppliers data
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCSVImportAndKPIAPI:
    """Test CSV Import for Suppliers/Categories and KPI API with API Keys"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session with cookies"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        return session
    
    @pytest.fixture(scope="class")
    def operator_session(self):
        """Login as operator and return session with cookies"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "operator@example.com",
            "password": "Operator123!"
        })
        assert login_resp.status_code == 200, f"Operator login failed: {login_resp.text}"
        return session
    
    # ============ CSV TEMPLATE TESTS ============
    
    def test_get_suppliers_csv_template(self, admin_session):
        """GET /api/suppliers/csv-template returns CSV template"""
        resp = admin_session.get(f"{BASE_URL}/api/suppliers/csv-template")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        assert "text/csv" in resp.headers.get("Content-Type", "")
        content = resp.text
        assert "name" in content.lower()
        assert "contact" in content.lower()
        assert "email" in content.lower()
        print("PASS: GET /api/suppliers/csv-template returns CSV template")
    
    def test_get_categories_csv_template(self, admin_session):
        """GET /api/categories/csv-template returns CSV template"""
        resp = admin_session.get(f"{BASE_URL}/api/categories/csv-template")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        assert "text/csv" in resp.headers.get("Content-Type", "")
        content = resp.text
        assert "name" in content.lower()
        assert "description" in content.lower()
        assert "color" in content.lower()
        print("PASS: GET /api/categories/csv-template returns CSV template")
    
    # ============ CSV IMPORT TESTS ============
    
    def test_import_suppliers_csv(self, admin_session):
        """POST /api/suppliers/import-csv imports suppliers from CSV"""
        csv_content = """name;contact;email;phone;address
TEST_Supplier_CSV1;Jean Test;test1@csv.com;0123456789;1 rue Test
TEST_Supplier_CSV2;Marie Test;test2@csv.com;0987654321;2 rue Test
"""
        files = {'file': ('test_suppliers.csv', io.BytesIO(csv_content.encode('utf-8')), 'text/csv')}
        resp = admin_session.post(f"{BASE_URL}/api/suppliers/import-csv", files=files)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        assert data.get("imported_count") >= 2
        print(f"PASS: POST /api/suppliers/import-csv imported {data.get('imported_count')} suppliers")
    
    def test_import_categories_csv(self, admin_session):
        """POST /api/categories/import-csv imports categories from CSV"""
        csv_content = """name;description;color
TEST_Category_CSV1;Test category 1;#FF5733
TEST_Category_CSV2;Test category 2;#33FF57
"""
        files = {'file': ('test_categories.csv', io.BytesIO(csv_content.encode('utf-8')), 'text/csv')}
        resp = admin_session.post(f"{BASE_URL}/api/categories/import-csv", files=files)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        assert data.get("imported_count") >= 2
        print(f"PASS: POST /api/categories/import-csv imported {data.get('imported_count')} categories")
    
    def test_import_auto_suppliers(self, admin_session):
        """POST /api/import/auto?import_type=suppliers works"""
        csv_content = """name;contact;email;phone;address
TEST_Auto_Supplier1;Auto Contact;auto@test.com;0111111111;Auto Address
"""
        files = {'file': ('auto_suppliers.csv', io.BytesIO(csv_content.encode('utf-8')), 'text/csv')}
        resp = admin_session.post(f"{BASE_URL}/api/import/auto?import_type=suppliers", files=files)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        assert data.get("imported_count") >= 1
        print(f"PASS: POST /api/import/auto?import_type=suppliers imported {data.get('imported_count')} suppliers")
    
    def test_import_auto_categories(self, admin_session):
        """POST /api/import/auto?import_type=categories works"""
        csv_content = """name;description;color
TEST_Auto_Category1;Auto category;#AABBCC
"""
        files = {'file': ('auto_categories.csv', io.BytesIO(csv_content.encode('utf-8')), 'text/csv')}
        resp = admin_session.post(f"{BASE_URL}/api/import/auto?import_type=categories", files=files)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        assert data.get("imported_count") >= 1
        print(f"PASS: POST /api/import/auto?import_type=categories imported {data.get('imported_count')} categories")
    
    # ============ KPI DOC (PUBLIC) ============
    
    def test_kpi_doc_public_no_auth(self):
        """GET /api/public/kpi/doc returns API documentation without auth"""
        resp = requests.get(f"{BASE_URL}/api/public/kpi/doc")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert "title" in data
        assert "endpoints" in data
        assert len(data["endpoints"]) == 5, f"Expected 5 endpoints, got {len(data['endpoints'])}"
        endpoint_urls = [ep["url"] for ep in data["endpoints"]]
        assert "/api/public/kpi/summary" in endpoint_urls
        assert "/api/public/kpi/costs" in endpoint_urls
        assert "/api/public/kpi/materials" in endpoint_urls
        assert "/api/public/kpi/recipes" in endpoint_urls
        assert "/api/public/kpi/suppliers" in endpoint_urls
        print("PASS: GET /api/public/kpi/doc returns documentation with 5 endpoints")
    
    # ============ KPI ENDPOINTS REQUIRE API KEY ============
    
    def test_kpi_summary_requires_api_key(self):
        """GET /api/public/kpi/summary returns 401 without API key"""
        resp = requests.get(f"{BASE_URL}/api/public/kpi/summary")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/public/kpi/summary returns 401 without API key")
    
    # ============ API KEYS MANAGEMENT ============
    
    def test_create_api_key_admin_only(self, admin_session, operator_session):
        """POST /api/api-keys creates API key (admin only)"""
        # Operator should fail
        resp = operator_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_Key_Operator"})
        assert resp.status_code == 403, f"Operator should get 403, got {resp.status_code}"
        
        # Admin should succeed
        resp = admin_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_Key_Admin"})
        assert resp.status_code == 200, f"Admin create key failed: {resp.text}"
        data = resp.json()
        assert "id" in data
        assert "key" in data
        assert data["key"].startswith("pk_")
        assert data["is_active"] == True
        print(f"PASS: POST /api/api-keys creates API key (admin only), key={data['key'][:12]}...")
        return data
    
    def test_list_api_keys_admin_only(self, admin_session, operator_session):
        """GET /api/api-keys lists API keys (admin only)"""
        # Operator should fail
        resp = operator_session.get(f"{BASE_URL}/api/api-keys")
        assert resp.status_code == 403, f"Operator should get 403, got {resp.status_code}"
        
        # Admin should succeed
        resp = admin_session.get(f"{BASE_URL}/api/api-keys")
        assert resp.status_code == 200, f"Admin list keys failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/api-keys lists {len(data)} API keys (admin only)")
        return data
    
    def test_toggle_api_key(self, admin_session):
        """PUT /api/api-keys/{id}/toggle toggles active status"""
        # First create a key
        create_resp = admin_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_Toggle_Key"})
        assert create_resp.status_code == 200
        key_data = create_resp.json()
        key_id = key_data["id"]
        initial_status = key_data["is_active"]
        
        # Toggle it
        toggle_resp = admin_session.put(f"{BASE_URL}/api/api-keys/{key_id}/toggle")
        assert toggle_resp.status_code == 200, f"Toggle failed: {toggle_resp.text}"
        toggle_data = toggle_resp.json()
        assert toggle_data["is_active"] != initial_status
        print(f"PASS: PUT /api/api-keys/{key_id}/toggle toggled status from {initial_status} to {toggle_data['is_active']}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/api-keys/{key_id}")
    
    def test_delete_api_key(self, admin_session):
        """DELETE /api/api-keys/{id} deletes a key"""
        # First create a key
        create_resp = admin_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_Delete_Key"})
        assert create_resp.status_code == 200
        key_id = create_resp.json()["id"]
        
        # Delete it
        delete_resp = admin_session.delete(f"{BASE_URL}/api/api-keys/{key_id}")
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        
        # Verify it's gone
        list_resp = admin_session.get(f"{BASE_URL}/api/api-keys")
        keys = list_resp.json()
        assert not any(k["id"] == key_id for k in keys)
        print(f"PASS: DELETE /api/api-keys/{key_id} deleted the key")
    
    # ============ KPI ENDPOINTS WITH VALID API KEY ============
    
    def test_kpi_summary_with_api_key(self, admin_session):
        """GET /api/public/kpi/summary works with valid API key"""
        # Create API key
        create_resp = admin_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_KPI_Summary_Key"})
        assert create_resp.status_code == 200
        api_key = create_resp.json()["key"]
        key_id = create_resp.json()["id"]
        
        # Use API key in header
        resp = requests.get(f"{BASE_URL}/api/public/kpi/summary", headers={"X-API-Key": api_key})
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert "total_recipes" in data
        assert "total_materials" in data
        assert "total_suppliers" in data
        assert "total_categories" in data
        assert "avg_cost_per_unit" in data
        assert "avg_margin" in data
        print(f"PASS: GET /api/public/kpi/summary works with API key, total_recipes={data['total_recipes']}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/api-keys/{key_id}")
    
    def test_kpi_costs_with_api_key(self, admin_session):
        """GET /api/public/kpi/costs works with valid API key"""
        # Create API key
        create_resp = admin_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_KPI_Costs_Key"})
        assert create_resp.status_code == 200
        api_key = create_resp.json()["key"]
        key_id = create_resp.json()["id"]
        
        # Use API key in query param
        resp = requests.get(f"{BASE_URL}/api/public/kpi/costs?api_key={api_key}")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/public/kpi/costs works with API key, returned {len(data)} recipes")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/api-keys/{key_id}")
    
    def test_kpi_materials_with_api_key(self, admin_session):
        """GET /api/public/kpi/materials works with valid API key"""
        # Create API key
        create_resp = admin_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_KPI_Materials_Key"})
        assert create_resp.status_code == 200
        api_key = create_resp.json()["key"]
        key_id = create_resp.json()["id"]
        
        resp = requests.get(f"{BASE_URL}/api/public/kpi/materials", headers={"X-API-Key": api_key})
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/public/kpi/materials works with API key, returned {len(data)} materials")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/api-keys/{key_id}")
    
    def test_kpi_recipes_with_api_key(self, admin_session):
        """GET /api/public/kpi/recipes works with valid API key"""
        # Create API key
        create_resp = admin_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_KPI_Recipes_Key"})
        assert create_resp.status_code == 200
        api_key = create_resp.json()["key"]
        key_id = create_resp.json()["id"]
        
        resp = requests.get(f"{BASE_URL}/api/public/kpi/recipes", headers={"X-API-Key": api_key})
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/public/kpi/recipes works with API key, returned {len(data)} recipes")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/api-keys/{key_id}")
    
    def test_kpi_suppliers_with_api_key(self, admin_session):
        """GET /api/public/kpi/suppliers works with valid API key"""
        # Create API key
        create_resp = admin_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_KPI_Suppliers_Key"})
        assert create_resp.status_code == 200
        api_key = create_resp.json()["key"]
        key_id = create_resp.json()["id"]
        
        resp = requests.get(f"{BASE_URL}/api/public/kpi/suppliers", headers={"X-API-Key": api_key})
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/public/kpi/suppliers works with API key, returned {len(data)} suppliers")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/api-keys/{key_id}")
    
    def test_kpi_costs_filter_by_supplier(self, admin_session):
        """GET /api/public/kpi/costs?supplier=xxx filters by supplier"""
        # Create API key
        create_resp = admin_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_KPI_Filter_Key"})
        assert create_resp.status_code == 200
        api_key = create_resp.json()["key"]
        key_id = create_resp.json()["id"]
        
        # Test with a non-existent supplier (should return empty list)
        resp = requests.get(f"{BASE_URL}/api/public/kpi/costs?supplier=NonExistentSupplier", headers={"X-API-Key": api_key})
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 0, f"Expected empty list for non-existent supplier, got {len(data)}"
        print("PASS: GET /api/public/kpi/costs?supplier=xxx filters by supplier (empty for non-existent)")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/api-keys/{key_id}")
    
    def test_invalid_api_key_rejected(self, admin_session):
        """Invalid API key is rejected with 403"""
        resp = requests.get(f"{BASE_URL}/api/public/kpi/summary", headers={"X-API-Key": "pk_invalid_key_12345"})
        assert resp.status_code == 403, f"Expected 403 for invalid key, got {resp.status_code}"
        print("PASS: Invalid API key is rejected with 403")
    
    def test_inactive_api_key_rejected(self, admin_session):
        """Inactive API key is rejected with 403"""
        # Create and deactivate a key
        create_resp = admin_session.post(f"{BASE_URL}/api/api-keys", json={"name": "TEST_Inactive_Key"})
        assert create_resp.status_code == 200
        api_key = create_resp.json()["key"]
        key_id = create_resp.json()["id"]
        
        # Deactivate it
        admin_session.put(f"{BASE_URL}/api/api-keys/{key_id}/toggle")
        
        # Try to use it
        resp = requests.get(f"{BASE_URL}/api/public/kpi/summary", headers={"X-API-Key": api_key})
        assert resp.status_code == 403, f"Expected 403 for inactive key, got {resp.status_code}"
        print("PASS: Inactive API key is rejected with 403")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/api-keys/{key_id}")
    
    # ============ CLEANUP ============
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_test_data(self, admin_session):
        """Cleanup TEST_ prefixed data after tests"""
        yield
        # Cleanup suppliers
        suppliers = admin_session.get(f"{BASE_URL}/api/suppliers").json()
        for s in suppliers:
            if s.get("name", "").startswith("TEST_"):
                admin_session.delete(f"{BASE_URL}/api/suppliers/{s['id']}")
        
        # Cleanup categories
        categories = admin_session.get(f"{BASE_URL}/api/categories").json()
        for c in categories:
            if c.get("name", "").startswith("TEST_"):
                admin_session.delete(f"{BASE_URL}/api/categories/{c['id']}")
        
        # Cleanup API keys
        keys = admin_session.get(f"{BASE_URL}/api/api-keys").json()
        for k in keys:
            if k.get("name", "").startswith("TEST_"):
                admin_session.delete(f"{BASE_URL}/api/api-keys/{k['id']}")
        
        print("Cleanup: Removed TEST_ prefixed data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
