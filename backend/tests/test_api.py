"""
Backend API Tests for Cost Calculator Application
Tests: Auth, Materials, Recipes, Suppliers, Categories, Overheads, Cost Calculation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cost-calculator-113.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin123!"


class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data['message']}")
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_materials" in data
        assert "total_recipes" in data
        assert "total_overheads" in data
        assert "recent_recipes" in data
        print(f"✓ Dashboard stats: {data['total_materials']} materials, {data['total_recipes']} recipes")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with admin credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL
        assert "name" in data
        assert "role" in data
        # Check cookies are set
        assert "access_token" in session.cookies or response.cookies.get("access_token") is not None
        print(f"✓ Login success: {data['email']} ({data['role']})")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login rejected correctly")
    
    def test_auth_me_without_token(self):
        """Test /auth/me without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Unauthenticated /auth/me rejected correctly")
    
    def test_auth_me_with_session(self):
        """Test /auth/me with valid session"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        data = me_response.json()
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Auth me: {data['email']}")
    
    def test_logout(self):
        """Test logout endpoint"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200
        print("✓ Logout successful")


class TestMaterials:
    """Materials CRUD tests"""
    
    def test_get_materials(self):
        """Test listing all materials"""
        response = requests.get(f"{BASE_URL}/api/materials")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get materials: {len(data)} materials found")
    
    def test_create_material(self):
        """Test creating a new material"""
        material_data = {
            "name": "TEST_Farine Test",
            "unit": "kg",
            "unit_price": 1.50,
            "supplier_name": "Test Supplier",
            "freinte": 2.5,
            "description": "Test material"
        }
        response = requests.post(f"{BASE_URL}/api/materials", json=material_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == material_data["name"]
        assert data["unit_price"] == material_data["unit_price"]
        assert data["freinte"] == material_data["freinte"]
        assert "id" in data
        print(f"✓ Created material: {data['name']} (id: {data['id']})")
        return data["id"]
    
    def test_create_and_get_material(self):
        """Test creating and then fetching material"""
        # Create
        material_data = {
            "name": "TEST_Sucre Test",
            "unit": "kg",
            "unit_price": 2.00,
            "freinte": 1.0
        }
        create_response = requests.post(f"{BASE_URL}/api/materials", json=material_data)
        assert create_response.status_code == 200
        created = create_response.json()
        material_id = created["id"]
        
        # Get all and verify
        get_response = requests.get(f"{BASE_URL}/api/materials")
        assert get_response.status_code == 200
        materials = get_response.json()
        found = next((m for m in materials if m["id"] == material_id), None)
        assert found is not None
        assert found["name"] == material_data["name"]
        print(f"✓ Material persisted and retrieved: {found['name']}")
    
    def test_update_material(self):
        """Test updating a material"""
        # First create
        create_response = requests.post(f"{BASE_URL}/api/materials", json={
            "name": "TEST_Update Material",
            "unit": "kg",
            "unit_price": 3.00,
            "freinte": 0
        })
        assert create_response.status_code == 200
        material_id = create_response.json()["id"]
        
        # Update
        update_data = {
            "name": "TEST_Updated Material",
            "unit": "kg",
            "unit_price": 4.50,
            "freinte": 5.0
        }
        update_response = requests.put(f"{BASE_URL}/api/materials/{material_id}", json=update_data)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["name"] == update_data["name"]
        assert updated["unit_price"] == update_data["unit_price"]
        assert updated["freinte"] == update_data["freinte"]
        print(f"✓ Material updated: {updated['name']}")
    
    def test_delete_material(self):
        """Test deleting a material"""
        # Create
        create_response = requests.post(f"{BASE_URL}/api/materials", json={
            "name": "TEST_Delete Material",
            "unit": "kg",
            "unit_price": 1.00
        })
        material_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/materials/{material_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/materials")
        materials = get_response.json()
        found = next((m for m in materials if m["id"] == material_id), None)
        assert found is None
        print("✓ Material deleted successfully")
    
    def test_csv_template(self):
        """Test CSV template download"""
        response = requests.get(f"{BASE_URL}/api/materials/csv-template")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ CSV template available")


class TestSuppliers:
    """Suppliers CRUD tests"""
    
    def test_get_suppliers(self):
        """Test listing suppliers"""
        response = requests.get(f"{BASE_URL}/api/suppliers")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Get suppliers: {len(response.json())} suppliers")
    
    def test_create_supplier(self):
        """Test creating a supplier"""
        supplier_data = {
            "name": "TEST_Supplier",
            "contact": "John Doe",
            "email": "test@supplier.com",
            "phone": "0123456789"
        }
        response = requests.post(f"{BASE_URL}/api/suppliers", json=supplier_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == supplier_data["name"]
        assert "id" in data
        print(f"✓ Created supplier: {data['name']}")
    
    def test_delete_supplier(self):
        """Test deleting a supplier"""
        # Create
        create_response = requests.post(f"{BASE_URL}/api/suppliers", json={
            "name": "TEST_Delete Supplier"
        })
        supplier_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}")
        assert delete_response.status_code == 200
        print("✓ Supplier deleted")


class TestCategories:
    """Categories CRUD tests"""
    
    def test_get_categories(self):
        """Test listing categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Get categories: {len(response.json())} categories")
    
    def test_create_category(self):
        """Test creating a category"""
        category_data = {
            "name": "TEST_Category",
            "description": "Test category",
            "color": "#FF5733"
        }
        response = requests.post(f"{BASE_URL}/api/categories", json=category_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == category_data["name"]
        print(f"✓ Created category: {data['name']}")
    
    def test_delete_category(self):
        """Test deleting a category"""
        # Create
        create_response = requests.post(f"{BASE_URL}/api/categories", json={
            "name": "TEST_Delete Category"
        })
        category_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/categories/{category_id}")
        assert delete_response.status_code == 200
        print("✓ Category deleted")


class TestOverheads:
    """Overheads CRUD tests"""
    
    def test_get_overheads(self):
        """Test listing overheads"""
        response = requests.get(f"{BASE_URL}/api/overheads")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Get overheads: {len(response.json())} overheads")
    
    def test_create_overhead(self):
        """Test creating an overhead"""
        overhead_data = {
            "name": "TEST_Electricity",
            "category": "electricity",
            "monthly_amount": 500.00,
            "allocation_method": "per_unit",
            "allocation_value": 100
        }
        response = requests.post(f"{BASE_URL}/api/overheads", json=overhead_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == overhead_data["name"]
        assert data["monthly_amount"] == overhead_data["monthly_amount"]
        print(f"✓ Created overhead: {data['name']}")
    
    def test_delete_overhead(self):
        """Test deleting an overhead"""
        # Create
        create_response = requests.post(f"{BASE_URL}/api/overheads", json={
            "name": "TEST_Delete Overhead",
            "category": "other",
            "monthly_amount": 100,
            "allocation_method": "fixed"
        })
        overhead_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/overheads/{overhead_id}")
        assert delete_response.status_code == 200
        print("✓ Overhead deleted")


class TestRecipes:
    """Recipes CRUD tests"""
    
    def test_get_recipes(self):
        """Test listing recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get recipes: {len(data)} recipes")
    
    def test_get_intermediate_recipes(self):
        """Test listing intermediate recipes (semi-finished)"""
        response = requests.get(f"{BASE_URL}/api/recipes/intermediate")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All should be intermediate
        for recipe in data:
            assert recipe.get("is_intermediate") == True
        print(f"✓ Get intermediate recipes: {len(data)} semi-finished recipes")
    
    def test_create_recipe(self):
        """Test creating a recipe"""
        recipe_data = {
            "name": "TEST_Recipe",
            "description": "Test recipe",
            "output_quantity": 10,
            "output_unit": "piece",
            "target_margin": 35,
            "is_intermediate": False,
            "ingredients": [],
            "labor_costs": [],
            "overhead_ids": []
        }
        response = requests.post(f"{BASE_URL}/api/recipes", json=recipe_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == recipe_data["name"]
        assert data["output_quantity"] == recipe_data["output_quantity"]
        assert data["target_margin"] == recipe_data["target_margin"]
        assert "id" in data
        print(f"✓ Created recipe: {data['name']} (id: {data['id']})")
        return data["id"]
    
    def test_get_recipe_by_id(self):
        """Test getting a specific recipe"""
        # First get all recipes
        all_response = requests.get(f"{BASE_URL}/api/recipes")
        recipes = all_response.json()
        if len(recipes) == 0:
            pytest.skip("No recipes to test")
        
        recipe_id = recipes[0]["id"]
        response = requests.get(f"{BASE_URL}/api/recipes/{recipe_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == recipe_id
        print(f"✓ Get recipe by ID: {data['name']}")
    
    def test_update_recipe(self):
        """Test updating a recipe"""
        # Create
        create_response = requests.post(f"{BASE_URL}/api/recipes", json={
            "name": "TEST_Update Recipe",
            "output_quantity": 5,
            "output_unit": "kg",
            "target_margin": 25
        })
        recipe_id = create_response.json()["id"]
        
        # Update
        update_data = {
            "name": "TEST_Updated Recipe",
            "target_margin": 40
        }
        update_response = requests.put(f"{BASE_URL}/api/recipes/{recipe_id}", json=update_data)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["name"] == update_data["name"]
        assert updated["target_margin"] == update_data["target_margin"]
        print(f"✓ Recipe updated: {updated['name']}")
    
    def test_delete_recipe(self):
        """Test deleting a recipe"""
        # Create
        create_response = requests.post(f"{BASE_URL}/api/recipes", json={
            "name": "TEST_Delete Recipe",
            "output_quantity": 1,
            "output_unit": "piece"
        })
        recipe_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/recipes/{recipe_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/recipes/{recipe_id}")
        assert get_response.status_code == 404
        print("✓ Recipe deleted")


class TestCostCalculation:
    """Cost calculation tests"""
    
    def test_recipe_cost_endpoint(self):
        """Test recipe cost calculation endpoint"""
        # Get existing recipes
        recipes_response = requests.get(f"{BASE_URL}/api/recipes")
        recipes = recipes_response.json()
        if len(recipes) == 0:
            pytest.skip("No recipes to test cost calculation")
        
        recipe_id = recipes[0]["id"]
        response = requests.get(f"{BASE_URL}/api/recipes/{recipe_id}/cost")
        assert response.status_code == 200
        data = response.json()
        
        # Verify cost breakdown structure
        assert "recipe_id" in data
        assert "recipe_name" in data
        assert "total_material_cost" in data
        assert "total_labor_cost" in data
        assert "total_overhead_cost" in data
        assert "total_freinte_cost" in data
        assert "total_cost" in data
        assert "cost_per_unit" in data
        assert "target_margin" in data
        assert "suggested_price" in data
        assert "material_details" in data
        assert "labor_details" in data
        assert "overhead_details" in data
        assert "sub_recipe_details" in data
        
        print(f"✓ Cost calculation: {data['recipe_name']} - {data['cost_per_unit']} EUR/unit")
    
    def test_all_costs_report(self):
        """Test all costs report endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/all-costs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            cost = data[0]
            assert "recipe_id" in cost
            assert "recipe_name" in cost
            assert "material_cost" in cost
            assert "labor_cost" in cost
            assert "overhead_cost" in cost
            assert "freinte_cost" in cost
            assert "total_cost" in cost
            assert "cost_per_unit" in cost
            assert "suggested_price" in cost
        
        print(f"✓ All costs report: {len(data)} recipes")
    
    def test_recipe_comparison(self):
        """Test recipe comparison endpoint"""
        # Get recipes
        recipes_response = requests.get(f"{BASE_URL}/api/recipes")
        recipes = recipes_response.json()
        if len(recipes) < 2:
            pytest.skip("Need at least 2 recipes for comparison")
        
        recipe_ids = [recipes[0]["id"], recipes[1]["id"]]
        response = requests.post(f"{BASE_URL}/api/recipes/compare", json=recipe_ids)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        
        for item in data:
            assert "recipe_id" in item
            assert "recipe_name" in item
            assert "cost_per_unit" in item
            assert "suggested_price" in item
        
        print(f"✓ Recipe comparison: {len(data)} recipes compared")
    
    def test_excel_export(self):
        """Test Excel/CSV export endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/export-excel")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Excel export available")


class TestPDFExport:
    """PDF export tests"""
    
    def test_recipe_pdf_export(self):
        """Test PDF export for a recipe"""
        # Get existing recipes
        recipes_response = requests.get(f"{BASE_URL}/api/recipes")
        recipes = recipes_response.json()
        if len(recipes) == 0:
            pytest.skip("No recipes to test PDF export")
        
        recipe_id = recipes[0]["id"]
        response = requests.get(f"{BASE_URL}/api/recipes/{recipe_id}/pdf")
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        print(f"✓ PDF export for recipe: {recipes[0]['name']}")


class TestRecipeWithIngredients:
    """Test recipe with ingredients and cost calculation"""
    
    def test_create_recipe_with_ingredients(self):
        """Test creating a recipe with ingredients and calculating cost"""
        # First create a material
        material_response = requests.post(f"{BASE_URL}/api/materials", json={
            "name": "TEST_Ingredient Material",
            "unit": "kg",
            "unit_price": 5.00,
            "freinte": 10.0
        })
        material = material_response.json()
        material_id = material["id"]
        
        # Create recipe
        recipe_response = requests.post(f"{BASE_URL}/api/recipes", json={
            "name": "TEST_Recipe With Ingredients",
            "output_quantity": 10,
            "output_unit": "piece",
            "target_margin": 30,
            "ingredients": [{
                "material_id": material_id,
                "material_name": material["name"],
                "quantity": 2.0,
                "unit": "kg",
                "unit_price": 5.00,
                "freinte": 10.0,
                "is_sub_recipe": False
            }],
            "labor_costs": [{
                "description": "Preparation",
                "hours": 1.0,
                "hourly_rate": 15.00
            }]
        })
        assert recipe_response.status_code == 200
        recipe = recipe_response.json()
        recipe_id = recipe["id"]
        
        # Get cost
        cost_response = requests.get(f"{BASE_URL}/api/recipes/{recipe_id}/cost")
        assert cost_response.status_code == 200
        cost = cost_response.json()
        
        # Verify calculations
        # Material: 2kg * 5€ = 10€, with 10% freinte = 11€
        # Labor: 1h * 15€ = 15€
        # Total: 26€ for 10 pieces = 2.6€/piece
        assert cost["total_material_cost"] == 11.0
        assert cost["total_labor_cost"] == 15.0
        assert cost["total_freinte_cost"] == 1.0
        assert cost["cost_per_unit"] == 2.6
        
        print(f"✓ Recipe with ingredients: cost_per_unit = {cost['cost_per_unit']} EUR")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/recipes/{recipe_id}")
        requests.delete(f"{BASE_URL}/api/materials/{material_id}")


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    
    # Cleanup materials
    materials = requests.get(f"{BASE_URL}/api/materials").json()
    for m in materials:
        if m["name"].startswith("TEST_"):
            requests.delete(f"{BASE_URL}/api/materials/{m['id']}")
    
    # Cleanup recipes
    recipes = requests.get(f"{BASE_URL}/api/recipes").json()
    for r in recipes:
        if r["name"].startswith("TEST_"):
            requests.delete(f"{BASE_URL}/api/recipes/{r['id']}")
    
    # Cleanup suppliers
    suppliers = requests.get(f"{BASE_URL}/api/suppliers").json()
    for s in suppliers:
        if s["name"].startswith("TEST_"):
            requests.delete(f"{BASE_URL}/api/suppliers/{s['id']}")
    
    # Cleanup categories
    categories = requests.get(f"{BASE_URL}/api/categories").json()
    for c in categories:
        if c["name"].startswith("TEST_"):
            requests.delete(f"{BASE_URL}/api/categories/{c['id']}")
    
    # Cleanup overheads
    overheads = requests.get(f"{BASE_URL}/api/overheads").json()
    for o in overheads:
        if o["name"].startswith("TEST_"):
            requests.delete(f"{BASE_URL}/api/overheads/{o['id']}")
    
    print("\n✓ Test data cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
