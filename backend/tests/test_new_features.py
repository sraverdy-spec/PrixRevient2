"""
Backend API Tests for New Features - Iteration 2
Tests: BOM CSV Import, Auto Import API, SFTP Scan, Import Status
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cost-calculator-113.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin123!"


class TestBOMCSVImport:
    """BOM CSV Import endpoint tests"""
    
    def test_bom_csv_template_endpoint(self):
        """Test GET /api/recipes/bom-csv-template returns CSV template"""
        response = requests.get(f"{BASE_URL}/api/recipes/bom-csv-template")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.text
        # Verify template has required columns
        assert "name" in content.lower()
        assert "sub_recipe" in content.lower()
        assert "is_intermediate" in content.lower()
        print(f"✓ BOM CSV template available with sub_recipe column")
    
    def test_bom_csv_import_endpoint_exists(self):
        """Test POST /api/recipes/import-bom-csv endpoint exists"""
        # Test with invalid file to verify endpoint exists
        response = requests.post(f"{BASE_URL}/api/recipes/import-bom-csv")
        # Should return 422 (validation error) not 404
        assert response.status_code != 404
        print(f"✓ BOM CSV import endpoint exists (status: {response.status_code})")
    
    def test_bom_csv_import_with_valid_csv(self):
        """Test importing BOM CSV with intermediate and final recipes"""
        csv_content = """name;description;output_quantity;output_unit;margin;is_intermediate;ingredient_name;ingredient_quantity;ingredient_unit;ingredient_price;freinte;sub_recipe;labor_description;labor_hours;labor_rate
TEST_Pate_BOM;Pate de base;1;kg;30;oui;Farine;0.5;kg;1.20;2;;Petrissage;0.5;15
TEST_Pate_BOM;Pate de base;1;kg;30;oui;Beurre;0.25;kg;8.00;3;;;;
TEST_Tarte_BOM;Tarte test;8;piece;35;non;Sucre;0.1;kg;1.50;2;;Preparation;1;15
TEST_Tarte_BOM;Tarte test;8;piece;35;non;;;;;;TEST_Pate_BOM:0.5:kg;;;
"""
        files = {'file': ('test_bom.csv', io.BytesIO(csv_content.encode('utf-8-sig')), 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/recipes/import-bom-csv", files=files)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "imported_count" in data
        assert "intermediate_count" in data
        assert "final_count" in data
        print(f"✓ BOM CSV import: {data['imported_count']} recipes ({data['intermediate_count']} intermediate, {data['final_count']} final)")
        return data
    
    def test_bom_csv_import_rejects_non_csv(self):
        """Test that non-CSV files are rejected"""
        files = {'file': ('test.txt', io.BytesIO(b'not a csv'), 'text/plain')}
        response = requests.post(f"{BASE_URL}/api/recipes/import-bom-csv", files=files)
        assert response.status_code == 400
        print("✓ Non-CSV file rejected correctly")


class TestAutoImportAPI:
    """Auto Import API endpoint tests"""
    
    def test_auto_import_endpoint_exists(self):
        """Test POST /api/import/auto endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/import/auto?import_type=materials")
        # Should return 422 (validation error for missing file) not 404
        assert response.status_code != 404
        print(f"✓ Auto import endpoint exists (status: {response.status_code})")
    
    def test_auto_import_materials(self):
        """Test auto import with materials type"""
        csv_content = """name;unit;unit_price;supplier;freinte;stock
TEST_AutoMat1;kg;5.00;Test Supplier;2;100
TEST_AutoMat2;L;3.50;Test Supplier;1;50
"""
        files = {'file': ('materials.csv', io.BytesIO(csv_content.encode('utf-8-sig')), 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/import/auto?import_type=materials", files=files)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "imported_count" in data
        print(f"✓ Auto import materials: {data['imported_count']} imported")
    
    def test_auto_import_recipes(self):
        """Test auto import with recipes type"""
        csv_content = """name;description;output_quantity;output_unit;margin;ingredient_name;ingredient_quantity;ingredient_unit;ingredient_price;freinte;labor_description;labor_hours;labor_rate
TEST_AutoRecipe;Test recipe;10;piece;30;Farine;1;kg;1.50;2;Prep;0.5;15
"""
        files = {'file': ('recipes.csv', io.BytesIO(csv_content.encode('utf-8-sig')), 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/import/auto?import_type=recipes", files=files)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        print(f"✓ Auto import recipes: {data.get('imported_count', 0)} imported")
    
    def test_auto_import_bom(self):
        """Test auto import with bom type"""
        csv_content = """name;description;output_quantity;output_unit;margin;is_intermediate;ingredient_name;ingredient_quantity;ingredient_unit;ingredient_price;freinte;sub_recipe;labor_description;labor_hours;labor_rate
TEST_AutoBOM;Test BOM;5;piece;25;non;Sucre;0.2;kg;1.50;1;;Cuisson;0.5;12
"""
        files = {'file': ('bom.csv', io.BytesIO(csv_content.encode('utf-8-sig')), 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/import/auto?import_type=bom", files=files)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        print(f"✓ Auto import BOM: {data.get('imported_count', 0)} imported")
    
    def test_auto_import_invalid_type(self):
        """Test auto import with invalid type"""
        csv_content = "name;unit\nTest;kg"
        files = {'file': ('test.csv', io.BytesIO(csv_content.encode('utf-8-sig')), 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/import/auto?import_type=invalid", files=files)
        assert response.status_code == 400
        print("✓ Invalid import type rejected correctly")


class TestSFTPScan:
    """SFTP Scan endpoint tests"""
    
    def test_sftp_scan_endpoint_exists(self):
        """Test POST /api/import/sftp-scan endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/import/sftp-scan")
        assert response.status_code == 200
        data = response.json()
        assert "files_scanned" in data
        assert "results" in data
        assert "watch_directory" in data
        assert "processed_directory" in data
        print(f"✓ SFTP scan endpoint works: {data['files_scanned']} files scanned")
    
    def test_sftp_scan_returns_directory_info(self):
        """Test SFTP scan returns watch directory info"""
        response = requests.post(f"{BASE_URL}/api/import/sftp-scan")
        assert response.status_code == 200
        data = response.json()
        assert "import_watch" in data["watch_directory"]
        print(f"✓ SFTP watch directory: {data['watch_directory']}")


class TestImportStatus:
    """Import Status endpoint tests"""
    
    def test_import_status_endpoint(self):
        """Test GET /api/import/status endpoint"""
        response = requests.get(f"{BASE_URL}/api/import/status")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "watch_directory" in data
        assert "pending_files" in data
        assert "processed_count" in data
        assert "recent_imports" in data
        assert "api_endpoints" in data
        
        # Verify API endpoints documentation
        assert "auto_import" in data["api_endpoints"]
        assert "sftp_scan" in data["api_endpoints"]
        assert "status" in data["api_endpoints"]
        
        print(f"✓ Import status: {data['processed_count']} processed, {len(data['pending_files'])} pending")
    
    def test_import_status_shows_recent_imports(self):
        """Test that import status shows recent import history"""
        response = requests.get(f"{BASE_URL}/api/import/status")
        assert response.status_code == 200
        data = response.json()
        
        # recent_imports should be a list
        assert isinstance(data["recent_imports"], list)
        
        # If there are imports, verify structure
        if len(data["recent_imports"]) > 0:
            log = data["recent_imports"][0]
            assert "timestamp" in log
            assert "filename" in log
            assert "import_type" in log
            assert "source" in log
            print(f"✓ Recent imports: {len(data['recent_imports'])} entries")
        else:
            print("✓ Recent imports: empty (no imports yet)")


class TestDashboardStats:
    """Dashboard stats verification"""
    
    def test_dashboard_stats_updated(self):
        """Test dashboard stats reflect current data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_materials" in data
        assert "total_recipes" in data
        assert "total_overheads" in data
        assert "total_suppliers" in data
        assert "recent_recipes" in data
        
        print(f"✓ Dashboard stats: {data['total_recipes']} recipes, {data['total_materials']} materials")


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
    
    print("\n✓ Test data cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
