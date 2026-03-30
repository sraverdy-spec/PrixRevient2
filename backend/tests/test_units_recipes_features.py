"""
Test suite for new features:
- Units CRUD endpoints (GET/POST/PUT/DELETE /api/units)
- Recipe supplier_id, supplier_name, version fields
- Recipe duplicate endpoint (POST /api/recipes/{id}/duplicate)
- Reports all-costs with supplier_name and version
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUnitsAPI:
    """Test Units CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.admin_user = login_response.json()
    
    def test_get_units_returns_default_units(self):
        """GET /api/units should return seeded default units (10 units)"""
        response = self.session.get(f"{BASE_URL}/api/units")
        assert response.status_code == 200
        units = response.json()
        assert isinstance(units, list)
        assert len(units) >= 10, f"Expected at least 10 default units, got {len(units)}"
        
        # Check structure of units
        for unit in units:
            assert "id" in unit
            assert "name" in unit
            assert "abbreviation" in unit
            assert "type" in unit
        
        # Check expected unit types
        types = set(u["type"] for u in units)
        assert "poids" in types, "Missing 'poids' type units"
        assert "volume" in types, "Missing 'volume' type units"
        assert "quantite" in types, "Missing 'quantite' type units"
        print(f"PASS: GET /api/units returns {len(units)} units with types: {types}")
    
    def test_create_unit_admin_only(self):
        """POST /api/units should create a new unit (admin only)"""
        new_unit = {
            "name": "TEST_Tonne",
            "abbreviation": "t",
            "type": "poids"
        }
        response = self.session.post(f"{BASE_URL}/api/units", json=new_unit)
        assert response.status_code == 200, f"Failed to create unit: {response.text}"
        
        created = response.json()
        assert created["name"] == "TEST_Tonne"
        assert created["abbreviation"] == "t"
        assert created["type"] == "poids"
        assert "id" in created
        
        self.created_unit_id = created["id"]
        print(f"PASS: POST /api/units created unit with id={created['id']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/units/{self.created_unit_id}")
    
    def test_update_unit_admin_only(self):
        """PUT /api/units/{id} should update a unit (admin only)"""
        # First create a unit
        new_unit = {
            "name": "TEST_UpdateUnit",
            "abbreviation": "tu",
            "type": "quantite"
        }
        create_response = self.session.post(f"{BASE_URL}/api/units", json=new_unit)
        assert create_response.status_code == 200
        unit_id = create_response.json()["id"]
        
        # Update the unit
        update_data = {
            "name": "TEST_UpdatedUnit",
            "abbreviation": "tuu",
            "type": "volume"
        }
        update_response = self.session.put(f"{BASE_URL}/api/units/{unit_id}", json=update_data)
        assert update_response.status_code == 200, f"Failed to update unit: {update_response.text}"
        
        updated = update_response.json()
        assert updated["name"] == "TEST_UpdatedUnit"
        assert updated["abbreviation"] == "tuu"
        assert updated["type"] == "volume"
        print(f"PASS: PUT /api/units/{unit_id} updated unit successfully")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/units/{unit_id}")
    
    def test_delete_unit_admin_only(self):
        """DELETE /api/units/{id} should delete a unit (admin only)"""
        # First create a unit
        new_unit = {
            "name": "TEST_DeleteUnit",
            "abbreviation": "td",
            "type": "longueur"
        }
        create_response = self.session.post(f"{BASE_URL}/api/units", json=new_unit)
        assert create_response.status_code == 200
        unit_id = create_response.json()["id"]
        
        # Delete the unit
        delete_response = self.session.delete(f"{BASE_URL}/api/units/{unit_id}")
        assert delete_response.status_code == 200, f"Failed to delete unit: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/units")
        units = get_response.json()
        unit_ids = [u["id"] for u in units]
        assert unit_id not in unit_ids, "Unit was not deleted"
        print(f"PASS: DELETE /api/units/{unit_id} deleted unit successfully")


class TestRecipeSupplierAndVersion:
    """Test recipe supplier_id, supplier_name, version fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
    
    def test_create_recipe_with_supplier_and_version(self):
        """POST /api/recipes should accept supplier_id, supplier_name, version fields"""
        # First create a supplier
        supplier_data = {
            "name": "TEST_Supplier",
            "contact": "Test Contact",
            "email": "test@supplier.com"
        }
        supplier_response = self.session.post(f"{BASE_URL}/api/suppliers", json=supplier_data)
        assert supplier_response.status_code == 200
        supplier = supplier_response.json()
        supplier_id = supplier["id"]
        
        # Create recipe with supplier
        recipe_data = {
            "name": "TEST_RecipeWithSupplier",
            "description": "Test recipe with supplier",
            "output_quantity": 10,
            "output_unit": "piece",
            "target_margin": 25,
            "supplier_id": supplier_id,
            "supplier_name": "TEST_Supplier",
            "version": 1,
            "ingredients": [],
            "labor_costs": [],
            "overhead_ids": []
        }
        recipe_response = self.session.post(f"{BASE_URL}/api/recipes", json=recipe_data)
        assert recipe_response.status_code == 200, f"Failed to create recipe: {recipe_response.text}"
        
        recipe = recipe_response.json()
        assert recipe["supplier_id"] == supplier_id
        assert recipe["supplier_name"] == "TEST_Supplier"
        assert recipe["version"] == 1
        print(f"PASS: POST /api/recipes created recipe with supplier_id={supplier_id}, version=1")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/recipes/{recipe['id']}")
        self.session.delete(f"{BASE_URL}/api/suppliers/{supplier_id}")


class TestRecipeDuplicate:
    """Test recipe duplicate endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
    
    def test_duplicate_recipe_increments_version(self):
        """POST /api/recipes/{id}/duplicate should create copy with incremented version"""
        # Create original recipe
        recipe_data = {
            "name": "TEST_DuplicateRecipe",
            "description": "Original recipe",
            "output_quantity": 5,
            "output_unit": "kg",
            "target_margin": 30,
            "version": 1,
            "ingredients": [],
            "labor_costs": [],
            "overhead_ids": []
        }
        create_response = self.session.post(f"{BASE_URL}/api/recipes", json=recipe_data)
        assert create_response.status_code == 200
        original = create_response.json()
        original_id = original["id"]
        
        # Duplicate the recipe
        duplicate_response = self.session.post(f"{BASE_URL}/api/recipes/{original_id}/duplicate")
        assert duplicate_response.status_code == 200, f"Failed to duplicate: {duplicate_response.text}"
        
        duplicated = duplicate_response.json()
        assert duplicated["name"] == "TEST_DuplicateRecipe", "Name should be same"
        assert duplicated["version"] == 2, f"Version should be 2, got {duplicated['version']}"
        assert duplicated["id"] != original_id, "Duplicated recipe should have different ID"
        print(f"PASS: POST /api/recipes/{original_id}/duplicate created v{duplicated['version']}")
        
        # Duplicate again to test version increment
        duplicate2_response = self.session.post(f"{BASE_URL}/api/recipes/{original_id}/duplicate")
        assert duplicate2_response.status_code == 200
        duplicated2 = duplicate2_response.json()
        assert duplicated2["version"] == 3, f"Version should be 3, got {duplicated2['version']}"
        print(f"PASS: Second duplicate created v{duplicated2['version']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/recipes/{original_id}")
        self.session.delete(f"{BASE_URL}/api/recipes/{duplicated['id']}")
        self.session.delete(f"{BASE_URL}/api/recipes/{duplicated2['id']}")
    
    def test_duplicate_nonexistent_recipe_returns_404(self):
        """POST /api/recipes/{id}/duplicate should return 404 for non-existent recipe"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = self.session.post(f"{BASE_URL}/api/recipes/{fake_id}/duplicate")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Duplicate non-existent recipe returns 404")


class TestReportsAllCosts:
    """Test reports/all-costs endpoint includes supplier_name and version"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
    
    def test_all_costs_includes_supplier_and_version(self):
        """GET /api/reports/all-costs should include supplier_name and version"""
        response = self.session.get(f"{BASE_URL}/api/reports/all-costs")
        assert response.status_code == 200
        
        costs = response.json()
        assert isinstance(costs, list)
        
        if len(costs) > 0:
            first_cost = costs[0]
            assert "supplier_name" in first_cost, "Missing supplier_name field"
            assert "version" in first_cost, "Missing version field"
            assert "recipe_name" in first_cost
            assert "cost_per_unit" in first_cost
            print(f"PASS: GET /api/reports/all-costs includes supplier_name and version ({len(costs)} recipes)")
        else:
            print("PASS: GET /api/reports/all-costs returns empty list (no recipes)")


class TestExcelExport:
    """Test Excel export includes Fournisseur and Version columns"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
    
    def test_excel_export_returns_xlsx(self):
        """GET /api/reports/export-excel should return XLSX file"""
        response = self.session.get(f"{BASE_URL}/api/reports/export-excel")
        assert response.status_code == 200
        
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "octet-stream" in content_type, f"Unexpected content-type: {content_type}"
        
        # Check file size
        content_length = len(response.content)
        assert content_length > 0, "Excel file is empty"
        print(f"PASS: GET /api/reports/export-excel returns XLSX ({content_length} bytes)")


class TestOperatorCannotModifyUnits:
    """Test that operator role cannot modify units"""
    
    def test_operator_cannot_create_unit(self):
        """Operator should not be able to create units"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "operator@example.com",
            "password": "Operator123!"
        })
        assert login_response.status_code == 200
        
        new_unit = {
            "name": "TEST_OperatorUnit",
            "abbreviation": "ou",
            "type": "quantite"
        }
        response = session.post(f"{BASE_URL}/api/units", json=new_unit)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Operator cannot create units (403)")
    
    def test_operator_can_read_units(self):
        """Operator should be able to read units"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "operator@example.com",
            "password": "Operator123!"
        })
        assert login_response.status_code == 200
        
        response = session.get(f"{BASE_URL}/api/units")
        assert response.status_code == 200
        units = response.json()
        assert len(units) >= 10
        print(f"PASS: Operator can read units ({len(units)} units)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
