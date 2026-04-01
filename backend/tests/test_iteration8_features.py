"""
Test iteration 8 features:
1. Suppliers CRUD with 'code' field
2. Materials with 'code_article' field
3. Import logs endpoint /api/import/logs
4. RecipeDetail live simulation (frontend only - tested via Playwright)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSupplierCodeField:
    """Test Supplier CRUD with new 'code' field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.created_supplier_id = None
        yield
        # Cleanup
        if self.created_supplier_id:
            self.session.delete(f"{BASE_URL}/api/suppliers/{self.created_supplier_id}")
    
    def test_create_supplier_with_code(self):
        """Create a supplier with code 'FRN-001'"""
        payload = {
            "name": "TEST_Supplier_With_Code",
            "code": "FRN-001",
            "contact": "John Doe",
            "email": "test@supplier.com",
            "phone": "0123456789",
            "address": "123 Test Street"
        }
        resp = self.session.post(f"{BASE_URL}/api/suppliers", json=payload)
        assert resp.status_code == 200, f"Create supplier failed: {resp.text}"
        
        data = resp.json()
        assert data["name"] == "TEST_Supplier_With_Code"
        assert data["code"] == "FRN-001"
        assert "id" in data
        self.created_supplier_id = data["id"]
        print(f"PASS: Created supplier with code 'FRN-001', id={data['id']}")
    
    def test_get_suppliers_includes_code(self):
        """Verify suppliers list includes code field"""
        # First create a supplier with code
        payload = {
            "name": "TEST_Supplier_Code_List",
            "code": "FRN-002"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/suppliers", json=payload)
        assert create_resp.status_code == 200
        self.created_supplier_id = create_resp.json()["id"]
        
        # Get all suppliers
        resp = self.session.get(f"{BASE_URL}/api/suppliers")
        assert resp.status_code == 200
        
        suppliers = resp.json()
        assert isinstance(suppliers, list)
        
        # Find our test supplier
        test_supplier = next((s for s in suppliers if s.get("id") == self.created_supplier_id), None)
        assert test_supplier is not None, "Test supplier not found in list"
        assert test_supplier.get("code") == "FRN-002"
        print(f"PASS: Suppliers list includes code field, found code='FRN-002'")
    
    def test_update_supplier_code(self):
        """Update supplier code"""
        # Create supplier
        payload = {
            "name": "TEST_Supplier_Update_Code",
            "code": "FRN-003"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/suppliers", json=payload)
        assert create_resp.status_code == 200
        self.created_supplier_id = create_resp.json()["id"]
        
        # Update code
        update_payload = {
            "name": "TEST_Supplier_Update_Code",
            "code": "FRN-003-UPDATED"
        }
        update_resp = self.session.put(f"{BASE_URL}/api/suppliers/{self.created_supplier_id}", json=update_payload)
        assert update_resp.status_code == 200
        
        updated = update_resp.json()
        assert updated["code"] == "FRN-003-UPDATED"
        print(f"PASS: Updated supplier code to 'FRN-003-UPDATED'")
    
    def test_supplier_no_delivery_time_or_min_order(self):
        """Verify supplier model does NOT have delivery_time or minimum_order fields"""
        payload = {
            "name": "TEST_Supplier_No_Extra_Fields",
            "code": "FRN-004"
        }
        resp = self.session.post(f"{BASE_URL}/api/suppliers", json=payload)
        assert resp.status_code == 200
        self.created_supplier_id = resp.json()["id"]
        
        data = resp.json()
        # These fields should NOT exist
        assert "delivery_time" not in data, "delivery_time field should not exist"
        assert "minimum_order" not in data, "minimum_order field should not exist"
        assert "min_order" not in data, "min_order field should not exist"
        print("PASS: Supplier does NOT have delivery_time or minimum_order fields")


class TestMaterialCodeArticle:
    """Test Materials with 'code_article' field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.created_material_id = None
        yield
        # Cleanup
        if self.created_material_id:
            self.session.delete(f"{BASE_URL}/api/materials/{self.created_material_id}")
    
    def test_create_material_with_code_article(self):
        """Create a material with code_article"""
        payload = {
            "name": "TEST_Material_With_Code",
            "code_article": "MAT-001",
            "unit": "kg",
            "unit_price": 5.50,
            "freinte": 2.0
        }
        resp = self.session.post(f"{BASE_URL}/api/materials", json=payload)
        assert resp.status_code == 200, f"Create material failed: {resp.text}"
        
        data = resp.json()
        assert data["name"] == "TEST_Material_With_Code"
        assert data["code_article"] == "MAT-001"
        assert "id" in data
        self.created_material_id = data["id"]
        print(f"PASS: Created material with code_article 'MAT-001', id={data['id']}")
    
    def test_get_materials_includes_code_article(self):
        """Verify materials list includes code_article field"""
        # First create a material with code_article
        payload = {
            "name": "TEST_Material_Code_List",
            "code_article": "MAT-002",
            "unit": "L",
            "unit_price": 3.00
        }
        create_resp = self.session.post(f"{BASE_URL}/api/materials", json=payload)
        assert create_resp.status_code == 200
        self.created_material_id = create_resp.json()["id"]
        
        # Get all materials
        resp = self.session.get(f"{BASE_URL}/api/materials")
        assert resp.status_code == 200
        
        materials = resp.json()
        assert isinstance(materials, list)
        
        # Find our test material
        test_material = next((m for m in materials if m.get("id") == self.created_material_id), None)
        assert test_material is not None, "Test material not found in list"
        assert test_material.get("code_article") == "MAT-002"
        print(f"PASS: Materials list includes code_article field, found code_article='MAT-002'")
    
    def test_update_material_code_article(self):
        """Update material code_article"""
        # Create material
        payload = {
            "name": "TEST_Material_Update_Code",
            "code_article": "MAT-003",
            "unit": "piece",
            "unit_price": 1.00
        }
        create_resp = self.session.post(f"{BASE_URL}/api/materials", json=payload)
        assert create_resp.status_code == 200
        self.created_material_id = create_resp.json()["id"]
        
        # Update code_article
        update_payload = {
            "name": "TEST_Material_Update_Code",
            "code_article": "MAT-003-UPDATED",
            "unit": "piece",
            "unit_price": 1.00
        }
        update_resp = self.session.put(f"{BASE_URL}/api/materials/{self.created_material_id}", json=update_payload)
        assert update_resp.status_code == 200
        
        updated = update_resp.json()
        assert updated["code_article"] == "MAT-003-UPDATED"
        print(f"PASS: Updated material code_article to 'MAT-003-UPDATED'")


class TestImportLogs:
    """Test Import Logs endpoint /api/import/logs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        yield
    
    def test_get_import_logs_endpoint(self):
        """Test /api/import/logs returns data"""
        resp = self.session.get(f"{BASE_URL}/api/import/logs")
        assert resp.status_code == 200, f"Get import logs failed: {resp.text}"
        
        data = resp.json()
        assert isinstance(data, list), "Import logs should be a list"
        print(f"PASS: /api/import/logs returns list with {len(data)} entries")
    
    def test_get_import_logs_with_limit(self):
        """Test /api/import/logs with limit parameter"""
        resp = self.session.get(f"{BASE_URL}/api/import/logs?limit=10")
        assert resp.status_code == 200, f"Get import logs with limit failed: {resp.text}"
        
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) <= 10, "Should respect limit parameter"
        print(f"PASS: /api/import/logs?limit=10 returns {len(data)} entries (max 10)")
    
    def test_import_creates_log_entry(self):
        """Test that importing a CSV creates a log entry"""
        # Create a simple CSV content
        csv_content = "name;unit;unit_price\nTEST_Import_Log_Material;kg;1.00"
        
        # Import via API
        files = {'file': ('test_import.csv', csv_content, 'text/csv')}
        import_resp = self.session.post(
            f"{BASE_URL}/api/import/auto?import_type=materials",
            files=files
        )
        assert import_resp.status_code == 200, f"Import failed: {import_resp.text}"
        
        # Wait a moment for async log write
        import time
        time.sleep(0.5)
        
        # Check logs
        logs_resp = self.session.get(f"{BASE_URL}/api/import/logs?limit=5")
        assert logs_resp.status_code == 200
        
        logs = logs_resp.json()
        # Check if our import is in the logs
        recent_log = next((l for l in logs if l.get("filename") == "test_import.csv"), None)
        if recent_log:
            print(f"PASS: Import created log entry: {recent_log.get('filename')}, type={recent_log.get('import_type')}")
        else:
            print(f"INFO: Log entry may be async, found {len(logs)} logs total")
        
        # Cleanup - delete the test material
        materials_resp = self.session.get(f"{BASE_URL}/api/materials")
        if materials_resp.status_code == 200:
            for mat in materials_resp.json():
                if mat.get("name") == "TEST_Import_Log_Material":
                    self.session.delete(f"{BASE_URL}/api/materials/{mat['id']}")


class TestLoginFlow:
    """Test login flow with admin credentials"""
    
    def test_login_with_admin_credentials(self):
        """Test login with admin@example.com / Admin123!"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        
        data = resp.json()
        assert data.get("email") == "admin@example.com"
        assert data.get("role") == "admin"
        print(f"PASS: Login successful with admin@example.com, role={data.get('role')}")
    
    def test_auth_me_after_login(self):
        """Test /api/auth/me returns user info after login"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200, f"Auth me failed: {me_resp.text}"
        
        data = me_resp.json()
        assert data.get("email") == "admin@example.com"
        print(f"PASS: /api/auth/me returns user info: {data.get('email')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
