"""
RBAC (Role-Based Access Control) Tests for PrixRevient Application
Tests user management, role-based permissions, and access control
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin123!"
MANAGER_EMAIL = "manager@example.com"
MANAGER_PASSWORD = "Manager123!"
OPERATOR_EMAIL = "operator@example.com"
OPERATOR_PASSWORD = "Operator123!"


class TestAuthLogin:
    """Test login functionality for all roles"""
    
    def test_admin_login_returns_role(self):
        """Admin login should return role='admin' in response"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "role" in data, "Response should contain 'role' field"
        assert data["role"] == "admin", f"Expected role='admin', got '{data.get('role')}'"
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL
        print(f"PASS: Admin login returns role='admin'")
    
    def test_manager_login_returns_role(self):
        """Manager login should return role='manager' in response"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        assert "role" in data, "Response should contain 'role' field"
        assert data["role"] == "manager", f"Expected role='manager', got '{data.get('role')}'"
        print(f"PASS: Manager login returns role='manager'")
    
    def test_operator_login_returns_role(self):
        """Operator login should return role='operator' in response"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD
        })
        assert response.status_code == 200, f"Operator login failed: {response.text}"
        data = response.json()
        assert "role" in data, "Response should contain 'role' field"
        assert data["role"] == "operator", f"Expected role='operator', got '{data.get('role')}'"
        print(f"PASS: Operator login returns role='operator'")
    
    def test_registration_disabled(self):
        """POST /api/auth/register should return 403 (disabled)"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "newuser@example.com",
            "password": "Test123!",
            "name": "New User"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"PASS: Registration endpoint returns 403 (disabled)")


class TestAdminUserManagement:
    """Test admin-only user management endpoints"""
    
    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return session
    
    def test_admin_can_list_users(self, admin_session):
        """Admin can GET /api/users"""
        response = admin_session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        users = response.json()
        assert isinstance(users, list), "Response should be a list"
        assert len(users) >= 3, f"Expected at least 3 users (admin, manager, operator), got {len(users)}"
        # Verify user structure
        for user in users:
            assert "_id" in user, "User should have _id"
            assert "email" in user, "User should have email"
            assert "role" in user, "User should have role"
            assert "password_hash" not in user, "Password hash should not be exposed"
        print(f"PASS: Admin can list {len(users)} users")
    
    def test_admin_can_create_user(self, admin_session):
        """Admin can POST /api/users to create a new user"""
        test_email = f"TEST_newuser_{os.urandom(4).hex()}@example.com"
        response = admin_session.post(f"{BASE_URL}/api/users", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "TEST New User",
            "role": "manager"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["email"] == test_email.lower()
        assert data["role"] == "manager"
        assert data["name"] == "TEST New User"
        assert "_id" in data
        
        # Cleanup: delete the test user
        user_id = data["_id"]
        admin_session.delete(f"{BASE_URL}/api/users/{user_id}")
        print(f"PASS: Admin can create user with role='manager'")
    
    def test_admin_can_update_user_role(self, admin_session):
        """Admin can PUT /api/users/{id} to update role"""
        # First create a test user
        test_email = f"TEST_roleupdate_{os.urandom(4).hex()}@example.com"
        create_response = admin_session.post(f"{BASE_URL}/api/users", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "TEST Role Update",
            "role": "operator"
        })
        assert create_response.status_code == 200
        user_id = create_response.json()["_id"]
        
        # Update role to manager
        update_response = admin_session.put(f"{BASE_URL}/api/users/{user_id}", json={
            "role": "manager"
        })
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        updated_user = update_response.json()
        assert updated_user["role"] == "manager", f"Expected role='manager', got '{updated_user.get('role')}'"
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/users/{user_id}")
        print(f"PASS: Admin can update user role")
    
    def test_admin_can_change_user_password(self, admin_session):
        """Admin can PUT /api/users/{id}/password"""
        # First create a test user
        test_email = f"TEST_pwdchange_{os.urandom(4).hex()}@example.com"
        create_response = admin_session.post(f"{BASE_URL}/api/users", json={
            "email": test_email,
            "password": "OldPass123!",
            "name": "TEST Password Change",
            "role": "operator"
        })
        assert create_response.status_code == 200
        user_id = create_response.json()["_id"]
        
        # Change password
        pwd_response = admin_session.put(f"{BASE_URL}/api/users/{user_id}/password", json={
            "new_password": "NewPass456!"
        })
        assert pwd_response.status_code == 200, f"Expected 200, got {pwd_response.status_code}: {pwd_response.text}"
        
        # Verify new password works
        new_session = requests.Session()
        login_response = new_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "NewPass456!"
        })
        assert login_response.status_code == 200, "Login with new password should work"
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/users/{user_id}")
        print(f"PASS: Admin can change user password")
    
    def test_admin_can_toggle_user_active_status(self, admin_session):
        """Admin can PUT /api/users/{id} with is_active=false"""
        # First create a test user
        test_email = f"TEST_toggle_{os.urandom(4).hex()}@example.com"
        create_response = admin_session.post(f"{BASE_URL}/api/users", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "TEST Toggle Active",
            "role": "operator"
        })
        assert create_response.status_code == 200
        user_id = create_response.json()["_id"]
        
        # Deactivate user
        deactivate_response = admin_session.put(f"{BASE_URL}/api/users/{user_id}", json={
            "is_active": False
        })
        assert deactivate_response.status_code == 200
        assert deactivate_response.json()["is_active"] == False
        
        # Reactivate user
        activate_response = admin_session.put(f"{BASE_URL}/api/users/{user_id}", json={
            "is_active": True
        })
        assert activate_response.status_code == 200
        assert activate_response.json()["is_active"] == True
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/users/{user_id}")
        print(f"PASS: Admin can toggle user active status")
    
    def test_admin_can_delete_user(self, admin_session):
        """Admin can DELETE /api/users/{id}"""
        # First create a test user
        test_email = f"TEST_delete_{os.urandom(4).hex()}@example.com"
        create_response = admin_session.post(f"{BASE_URL}/api/users", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "TEST Delete User",
            "role": "operator"
        })
        assert create_response.status_code == 200
        user_id = create_response.json()["_id"]
        
        # Delete user
        delete_response = admin_session.delete(f"{BASE_URL}/api/users/{user_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify user is deleted
        list_response = admin_session.get(f"{BASE_URL}/api/users")
        users = list_response.json()
        user_ids = [u["_id"] for u in users]
        assert user_id not in user_ids, "Deleted user should not appear in list"
        print(f"PASS: Admin can delete user")
    
    def test_admin_cannot_demote_self(self, admin_session):
        """Admin cannot change their own role from admin"""
        # Get admin user ID
        me_response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        admin_id = me_response.json()["_id"]
        
        # Try to demote self
        demote_response = admin_session.put(f"{BASE_URL}/api/users/{admin_id}", json={
            "role": "manager"
        })
        assert demote_response.status_code == 400, f"Expected 400, got {demote_response.status_code}"
        print(f"PASS: Admin cannot demote self")
    
    def test_admin_cannot_deactivate_self(self, admin_session):
        """Admin cannot deactivate their own account"""
        # Get admin user ID
        me_response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        admin_id = me_response.json()["_id"]
        
        # Try to deactivate self
        deactivate_response = admin_session.put(f"{BASE_URL}/api/users/{admin_id}", json={
            "is_active": False
        })
        assert deactivate_response.status_code == 400, f"Expected 400, got {deactivate_response.status_code}"
        print(f"PASS: Admin cannot deactivate self")


class TestOperatorAccessRestrictions:
    """Test that operator role has restricted access"""
    
    @pytest.fixture
    def operator_session(self):
        """Get authenticated operator session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD
        })
        assert response.status_code == 200, f"Operator login failed: {response.text}"
        return session
    
    def test_operator_cannot_list_users(self, operator_session):
        """Operator cannot GET /api/users (should return 403)"""
        response = operator_session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"PASS: Operator cannot list users (403)")
    
    def test_operator_cannot_create_user(self, operator_session):
        """Operator cannot POST /api/users (should return 403)"""
        response = operator_session.post(f"{BASE_URL}/api/users", json={
            "email": "test@example.com",
            "password": "Test123!",
            "name": "Test User",
            "role": "operator"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"PASS: Operator cannot create user (403)")
    
    def test_operator_can_access_materials(self, operator_session):
        """Operator can GET /api/materials (read-only access)"""
        response = operator_session.get(f"{BASE_URL}/api/materials")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: Operator can read materials")
    
    def test_operator_can_access_recipes(self, operator_session):
        """Operator can GET /api/recipes (read-only access)"""
        response = operator_session.get(f"{BASE_URL}/api/recipes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: Operator can read recipes")


class TestDeactivatedUserLogin:
    """Test that deactivated users cannot login"""
    
    def test_deactivated_user_cannot_login(self):
        """Deactivated user should get 403 on login"""
        # Admin creates and deactivates a test user
        admin_session = requests.Session()
        admin_login = admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_login.status_code == 200
        
        # Create test user
        test_email = f"TEST_deactivated_{os.urandom(4).hex()}@example.com"
        create_response = admin_session.post(f"{BASE_URL}/api/users", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "TEST Deactivated User",
            "role": "operator"
        })
        assert create_response.status_code == 200
        user_id = create_response.json()["_id"]
        
        # Deactivate user
        admin_session.put(f"{BASE_URL}/api/users/{user_id}", json={"is_active": False})
        
        # Try to login as deactivated user
        user_session = requests.Session()
        login_response = user_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "TestPass123!"
        })
        assert login_response.status_code == 403, f"Expected 403, got {login_response.status_code}: {login_response.text}"
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/users/{user_id}")
        print(f"PASS: Deactivated user cannot login (403)")


class TestManagerAccess:
    """Test manager role access"""
    
    @pytest.fixture
    def manager_session(self):
        """Get authenticated manager session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        return session
    
    def test_manager_cannot_list_users(self, manager_session):
        """Manager cannot GET /api/users (admin only)"""
        response = manager_session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"PASS: Manager cannot list users (403)")
    
    def test_manager_can_access_materials(self, manager_session):
        """Manager can GET /api/materials"""
        response = manager_session.get(f"{BASE_URL}/api/materials")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: Manager can read materials")
    
    def test_manager_can_access_recipes(self, manager_session):
        """Manager can GET /api/recipes"""
        response = manager_session.get(f"{BASE_URL}/api/recipes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: Manager can read recipes")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
