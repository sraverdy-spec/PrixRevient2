import requests
import sys
import json
from datetime import datetime

class CostCalculatorAPITester:
    def __init__(self, base_url="https://cost-calculator-113.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_materials = []
        self.created_recipes = []
        self.created_overheads = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error details: {error_data}")
                except:
                    print(f"   Response text: {response.text}")

            return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            "Dashboard stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            required_fields = ['total_materials', 'total_recipes', 'total_overheads', 'avg_cost_per_unit', 'recent_recipes']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in dashboard stats: {field}")
                    return False
            print(f"   Dashboard stats: {response['total_materials']} materials, {response['total_recipes']} recipes, {response['total_overheads']} overheads")
        return success

    def test_materials_crud(self):
        """Test materials CRUD operations"""
        print("\n📦 Testing Materials CRUD...")
        
        # Test GET materials (empty initially)
        success, materials = self.run_test(
            "Get materials (initial)",
            "GET",
            "materials",
            200
        )
        if not success:
            return False

        # Test CREATE material
        material_data = {
            "name": "Farine de blé T55",
            "unit": "kg",
            "unit_price": 1.20,
            "supplier": "Moulin du Lac",
            "description": "Farine blanche pour boulangerie"
        }
        
        success, created_material = self.run_test(
            "Create material",
            "POST",
            "materials",
            200,
            data=material_data
        )
        if not success:
            return False
        
        if 'id' not in created_material:
            print("❌ Created material missing ID")
            return False
        
        material_id = created_material['id']
        self.created_materials.append(material_id)
        print(f"   Created material ID: {material_id}")

        # Test GET specific material by getting all and checking
        success, materials = self.run_test(
            "Get materials (after creation)",
            "GET",
            "materials",
            200
        )
        if not success or len(materials) == 0:
            print("❌ Material not found after creation")
            return False

        # Test UPDATE material
        updated_data = {
            "name": "Farine de blé T55 Premium",
            "unit": "kg",
            "unit_price": 1.35,
            "supplier": "Moulin du Lac",
            "description": "Farine blanche premium pour boulangerie"
        }
        
        success, updated_material = self.run_test(
            "Update material",
            "PUT",
            f"materials/{material_id}",
            200,
            data=updated_data
        )
        if not success:
            return False

        # Test DELETE material (we'll keep it for recipe tests)
        # success, _ = self.run_test(
        #     "Delete material",
        #     "DELETE",
        #     f"materials/{material_id}",
        #     200
        # )
        
        return True

    def test_overheads_crud(self):
        """Test overheads CRUD operations"""
        print("\n⚙️ Testing Overheads CRUD...")
        
        # Test GET overheads (empty initially)
        success, overheads = self.run_test(
            "Get overheads (initial)",
            "GET",
            "overheads",
            200
        )
        if not success:
            return False

        # Test CREATE overhead
        overhead_data = {
            "name": "Électricité atelier",
            "category": "electricity",
            "monthly_amount": 450.00,
            "allocation_method": "per_unit",
            "allocation_value": 100
        }
        
        success, created_overhead = self.run_test(
            "Create overhead",
            "POST",
            "overheads",
            200,
            data=overhead_data
        )
        if not success:
            return False
        
        if 'id' not in created_overhead:
            print("❌ Created overhead missing ID")
            return False
        
        overhead_id = created_overhead['id']
        self.created_overheads.append(overhead_id)
        print(f"   Created overhead ID: {overhead_id}")

        # Test UPDATE overhead
        updated_data = {
            "name": "Électricité atelier principal",
            "category": "electricity",
            "monthly_amount": 475.00,
            "allocation_method": "per_unit",
            "allocation_value": 120
        }
        
        success, updated_overhead = self.run_test(
            "Update overhead",
            "PUT",
            f"overheads/{overhead_id}",
            200,
            data=updated_data
        )
        
        return success

    def test_recipes_crud(self):
        """Test recipes CRUD operations"""
        print("\n🍞 Testing Recipes CRUD...")
        
        # Test GET recipes (empty initially)
        success, recipes = self.run_test(
            "Get recipes (initial)",
            "GET",
            "recipes",
            200
        )
        if not success:
            return False

        # Test CREATE recipe
        recipe_data = {
            "name": "Pain de campagne",
            "description": "Pain traditionnel français",
            "output_quantity": 2.0,
            "output_unit": "pièce",
            "ingredients": [],
            "labor_costs": [],
            "overhead_ids": []
        }
        
        success, created_recipe = self.run_test(
            "Create recipe",
            "POST",
            "recipes",
            200,
            data=recipe_data
        )
        if not success:
            return False
        
        if 'id' not in created_recipe:
            print("❌ Created recipe missing ID")
            return False
        
        recipe_id = created_recipe['id']
        self.created_recipes.append(recipe_id)
        print(f"   Created recipe ID: {recipe_id}")

        # Test GET specific recipe
        success, recipe = self.run_test(
            "Get specific recipe",
            "GET",
            f"recipes/{recipe_id}",
            200
        )
        if not success:
            return False

        # Test UPDATE recipe with ingredients, labor, and overheads
        if self.created_materials and self.created_overheads:
            updated_recipe_data = {
                "name": "Pain de campagne artisanal",
                "description": "Pain traditionnel français fait main",
                "output_quantity": 2.0,
                "output_unit": "pièce",
                "ingredients": [
                    {
                        "material_id": self.created_materials[0],
                        "material_name": "Farine de blé T55 Premium",
                        "quantity": 1.0,
                        "unit": "kg",
                        "unit_price": 1.35
                    }
                ],
                "labor_costs": [
                    {
                        "description": "Pétrissage et façonnage",
                        "hours": 2.0,
                        "hourly_rate": 15.00
                    }
                ],
                "overhead_ids": [self.created_overheads[0]]
            }
            
            success, updated_recipe = self.run_test(
                "Update recipe with ingredients/labor/overheads",
                "PUT",
                f"recipes/{recipe_id}",
                200,
                data=updated_recipe_data
            )
            if not success:
                return False

        return True

    def test_cost_calculation(self):
        """Test cost calculation for recipes"""
        print("\n💰 Testing Cost Calculation...")
        
        if not self.created_recipes:
            print("❌ No recipes available for cost calculation")
            return False

        recipe_id = self.created_recipes[0]
        success, cost_breakdown = self.run_test(
            "Calculate recipe cost",
            "GET",
            f"recipes/{recipe_id}/cost",
            200
        )
        
        if success:
            required_fields = [
                'recipe_id', 'recipe_name', 'total_material_cost', 
                'total_labor_cost', 'total_overhead_cost', 'total_cost', 
                'cost_per_unit', 'output_quantity', 'output_unit'
            ]
            for field in required_fields:
                if field not in cost_breakdown:
                    print(f"❌ Missing field in cost breakdown: {field}")
                    return False
            
            print(f"   Cost breakdown:")
            print(f"   - Materials: {cost_breakdown['total_material_cost']} €")
            print(f"   - Labor: {cost_breakdown['total_labor_cost']} €")
            print(f"   - Overheads: {cost_breakdown['total_overhead_cost']} €")
            print(f"   - Total: {cost_breakdown['total_cost']} €")
            print(f"   - Cost per unit: {cost_breakdown['cost_per_unit']} €")
        
        return success

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        print("\n🚫 Testing Error Handling...")
        
        # Test GET non-existent recipe
        success, _ = self.run_test(
            "Get non-existent recipe",
            "GET",
            "recipes/non-existent-id",
            404
        )
        if not success:
            return False

        # Test UPDATE non-existent material
        success, _ = self.run_test(
            "Update non-existent material",
            "PUT",
            "materials/non-existent-id",
            404,
            data={"name": "Test", "unit": "kg", "unit_price": 1.0}
        )
        if not success:
            return False

        # Test DELETE non-existent overhead
        success, _ = self.run_test(
            "Delete non-existent overhead",
            "DELETE",
            "overheads/non-existent-id",
            404
        )
        
        return success

    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created recipes
        for recipe_id in self.created_recipes:
            self.run_test(
                f"Delete recipe {recipe_id}",
                "DELETE",
                f"recipes/{recipe_id}",
                200
            )
        
        # Delete created materials
        for material_id in self.created_materials:
            self.run_test(
                f"Delete material {material_id}",
                "DELETE",
                f"materials/{material_id}",
                200
            )
        
        # Delete created overheads
        for overhead_id in self.created_overheads:
            self.run_test(
                f"Delete overhead {overhead_id}",
                "DELETE",
                f"overheads/{overhead_id}",
                200
            )

def main():
    print("🧪 Starting Cost Calculator API Tests...")
    print("=" * 50)
    
    tester = CostCalculatorAPITester()
    
    # Run all tests
    tests = [
        tester.test_root_endpoint,
        tester.test_dashboard_stats,
        tester.test_materials_crud,
        tester.test_overheads_crud,
        tester.test_recipes_crud,
        tester.test_cost_calculation,
        tester.test_error_handling
    ]
    
    all_passed = True
    for test in tests:
        if not test():
            all_passed = False
    
    # Cleanup
    tester.cleanup()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if all_passed:
        print("🎉 All API tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())