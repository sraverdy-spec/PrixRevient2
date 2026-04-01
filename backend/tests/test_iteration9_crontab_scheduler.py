"""
Iteration 9 Tests: Crontab CRUD, Scheduler, and SSO Status
Tests for:
- Crontab CRUD: create/read/update/delete tâches planifiées via /api/crontabs
- Crontab manual run: POST /api/crontabs/{id}/run executes the task
- Crontab task types: 'sftp_scan' and 'price_history' both execute correctly
- Scheduler status: GET /api/scheduler/status returns running=true and next_run times
- Crontab toggle: PUT /api/crontabs/{id} with enabled=false removes job from scheduler
- SSO backend: GET /api/auth/sso/status returns google_enabled and microsoft_enabled
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCrontabCRUD:
    """Test Crontab CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.created_crontab_ids = []
        yield
        # Cleanup: delete created crontabs
        for cron_id in self.created_crontab_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/crontabs/{cron_id}")
            except:
                pass
    
    def test_create_crontab_sftp_scan(self):
        """Test creating a crontab with sftp_scan type"""
        response = self.session.post(f"{BASE_URL}/api/crontabs", json={
            "name": "TEST_SFTP_Scan_Task",
            "type": "sftp_scan",
            "schedule": "*/30 * * * *",
            "enabled": True
        })
        assert response.status_code == 200, f"Create crontab failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["name"] == "TEST_SFTP_Scan_Task"
        assert data["type"] == "sftp_scan"
        assert data["schedule"] == "*/30 * * * *"
        assert data["enabled"] == True
        assert data["last_run"] is None
        assert data["last_result"] is None
        assert data["last_status"] is None
        
        self.created_crontab_ids.append(data["id"])
        print(f"Created crontab: {data['id']}")
    
    def test_create_crontab_price_history(self):
        """Test creating a crontab with price_history type"""
        response = self.session.post(f"{BASE_URL}/api/crontabs", json={
            "name": "TEST_Price_History_Task",
            "type": "price_history",
            "schedule": "0 8 * * *",
            "enabled": True
        })
        assert response.status_code == 200, f"Create crontab failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Price_History_Task"
        assert data["type"] == "price_history"
        assert data["schedule"] == "0 8 * * *"
        
        self.created_crontab_ids.append(data["id"])
        print(f"Created price_history crontab: {data['id']}")
    
    def test_get_crontabs(self):
        """Test listing all crontabs"""
        # First create a crontab
        create_response = self.session.post(f"{BASE_URL}/api/crontabs", json={
            "name": "TEST_List_Task",
            "type": "sftp_scan",
            "schedule": "*/15 * * * *",
            "enabled": True
        })
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_crontab_ids.append(created["id"])
        
        # Get all crontabs
        response = self.session.get(f"{BASE_URL}/api/crontabs")
        assert response.status_code == 200, f"Get crontabs failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        # Find our created crontab
        found = [c for c in data if c["id"] == created["id"]]
        assert len(found) == 1, "Created crontab not found in list"
        print(f"Found {len(data)} crontabs in list")
    
    def test_update_crontab(self):
        """Test updating a crontab"""
        # Create a crontab
        create_response = self.session.post(f"{BASE_URL}/api/crontabs", json={
            "name": "TEST_Update_Task",
            "type": "sftp_scan",
            "schedule": "*/30 * * * *",
            "enabled": True
        })
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_crontab_ids.append(created["id"])
        
        # Update the crontab
        update_response = self.session.put(f"{BASE_URL}/api/crontabs/{created['id']}", json={
            "name": "TEST_Updated_Task",
            "schedule": "0 * * * *",
            "enabled": False
        })
        assert update_response.status_code == 200, f"Update crontab failed: {update_response.text}"
        updated = update_response.json()
        
        assert updated["name"] == "TEST_Updated_Task"
        assert updated["schedule"] == "0 * * * *"
        assert updated["enabled"] == False
        print(f"Updated crontab: {updated['id']}")
    
    def test_delete_crontab(self):
        """Test deleting a crontab"""
        # Create a crontab
        create_response = self.session.post(f"{BASE_URL}/api/crontabs", json={
            "name": "TEST_Delete_Task",
            "type": "sftp_scan",
            "schedule": "*/30 * * * *",
            "enabled": True
        })
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Delete the crontab
        delete_response = self.session.delete(f"{BASE_URL}/api/crontabs/{created['id']}")
        assert delete_response.status_code == 200, f"Delete crontab failed: {delete_response.text}"
        
        # Verify it's deleted
        get_response = self.session.get(f"{BASE_URL}/api/crontabs")
        assert get_response.status_code == 200
        crontabs = get_response.json()
        found = [c for c in crontabs if c["id"] == created["id"]]
        assert len(found) == 0, "Crontab should be deleted"
        print(f"Deleted crontab: {created['id']}")


class TestCrontabManualRun:
    """Test manual execution of crontab tasks"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.created_crontab_ids = []
        yield
        # Cleanup
        for cron_id in self.created_crontab_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/crontabs/{cron_id}")
            except:
                pass
    
    def test_run_sftp_scan_task(self):
        """Test manual execution of sftp_scan task"""
        # Create a crontab
        create_response = self.session.post(f"{BASE_URL}/api/crontabs", json={
            "name": "TEST_Run_SFTP_Task",
            "type": "sftp_scan",
            "schedule": "*/30 * * * *",
            "enabled": True
        })
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_crontab_ids.append(created["id"])
        
        # Run the task manually
        run_response = self.session.post(f"{BASE_URL}/api/crontabs/{created['id']}/run")
        assert run_response.status_code == 200, f"Run crontab failed: {run_response.text}"
        run_data = run_response.json()
        
        assert "message" in run_data
        assert run_data["message"] == "Execute"
        print(f"Run result: {run_data}")
        
        # Verify last_run and last_status are updated
        time.sleep(0.5)  # Small delay for DB update
        get_response = self.session.get(f"{BASE_URL}/api/crontabs")
        assert get_response.status_code == 200
        crontabs = get_response.json()
        found = [c for c in crontabs if c["id"] == created["id"]]
        assert len(found) == 1
        
        cron = found[0]
        assert cron["last_run"] is not None, "last_run should be updated after execution"
        assert cron["last_status"] in ["success", "error"], "last_status should be set"
        print(f"After run - last_run: {cron['last_run']}, last_status: {cron['last_status']}, last_result: {cron['last_result']}")
    
    def test_run_price_history_task(self):
        """Test manual execution of price_history task"""
        # Create a crontab
        create_response = self.session.post(f"{BASE_URL}/api/crontabs", json={
            "name": "TEST_Run_Price_History_Task",
            "type": "price_history",
            "schedule": "0 8 * * *",
            "enabled": True
        })
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_crontab_ids.append(created["id"])
        
        # Run the task manually
        run_response = self.session.post(f"{BASE_URL}/api/crontabs/{created['id']}/run")
        assert run_response.status_code == 200, f"Run crontab failed: {run_response.text}"
        run_data = run_response.json()
        
        assert "message" in run_data
        assert run_data["message"] == "Execute"
        print(f"Price history run result: {run_data}")
        
        # Verify last_run and last_status are updated
        time.sleep(0.5)
        get_response = self.session.get(f"{BASE_URL}/api/crontabs")
        assert get_response.status_code == 200
        crontabs = get_response.json()
        found = [c for c in crontabs if c["id"] == created["id"]]
        assert len(found) == 1
        
        cron = found[0]
        assert cron["last_run"] is not None
        assert cron["last_status"] == "success", f"Expected success, got {cron['last_status']}"
        # Result should contain "recettes enregistrees"
        assert "recettes" in cron["last_result"].lower() or cron["last_result"] == "0 recettes enregistrees"
        print(f"Price history - last_result: {cron['last_result']}")
    
    def test_run_nonexistent_crontab(self):
        """Test running a non-existent crontab returns 404"""
        run_response = self.session.post(f"{BASE_URL}/api/crontabs/nonexistent-id/run")
        assert run_response.status_code == 404, f"Expected 404, got {run_response.status_code}"


class TestSchedulerStatus:
    """Test scheduler status endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.created_crontab_ids = []
        yield
        # Cleanup
        for cron_id in self.created_crontab_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/crontabs/{cron_id}")
            except:
                pass
    
    def test_scheduler_status_running(self):
        """Test that scheduler status returns running=true"""
        response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200, f"Get scheduler status failed: {response.text}"
        data = response.json()
        
        assert "running" in data
        assert data["running"] == True, "Scheduler should be running"
        assert "jobs" in data
        assert isinstance(data["jobs"], list)
        print(f"Scheduler status: running={data['running']}, jobs={len(data['jobs'])}")
    
    def test_scheduler_shows_active_jobs(self):
        """Test that scheduler shows next_run times for active jobs"""
        # Create an enabled crontab
        create_response = self.session.post(f"{BASE_URL}/api/crontabs", json={
            "name": "TEST_Scheduler_Job",
            "type": "sftp_scan",
            "schedule": "*/5 * * * *",
            "enabled": True
        })
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_crontab_ids.append(created["id"])
        
        # Check scheduler status
        time.sleep(0.5)  # Allow scheduler to sync
        status_response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert status_response.status_code == 200
        status = status_response.json()
        
        assert status["running"] == True
        # Find our job in the list
        job_found = [j for j in status["jobs"] if j["cron_id"] == created["id"]]
        assert len(job_found) == 1, f"Job not found in scheduler. Jobs: {status['jobs']}"
        
        job = job_found[0]
        assert job["next_run"] is not None, "next_run should be set for active job"
        print(f"Job {created['id']} next_run: {job['next_run']}")
    
    def test_disabled_crontab_not_in_scheduler(self):
        """Test that disabled crontab is removed from scheduler"""
        # Create an enabled crontab
        create_response = self.session.post(f"{BASE_URL}/api/crontabs", json={
            "name": "TEST_Disable_Job",
            "type": "sftp_scan",
            "schedule": "*/5 * * * *",
            "enabled": True
        })
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_crontab_ids.append(created["id"])
        
        # Verify it's in the scheduler
        time.sleep(0.5)
        status_response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert status_response.status_code == 200
        status = status_response.json()
        job_found = [j for j in status["jobs"] if j["cron_id"] == created["id"]]
        assert len(job_found) == 1, "Job should be in scheduler when enabled"
        
        # Disable the crontab
        update_response = self.session.put(f"{BASE_URL}/api/crontabs/{created['id']}", json={
            "enabled": False
        })
        assert update_response.status_code == 200
        
        # Verify it's removed from scheduler
        time.sleep(0.5)
        status_response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert status_response.status_code == 200
        status = status_response.json()
        job_found = [j for j in status["jobs"] if j["cron_id"] == created["id"]]
        assert len(job_found) == 0, "Job should be removed from scheduler when disabled"
        print(f"Disabled job {created['id']} removed from scheduler")


class TestSSOStatus:
    """Test SSO status endpoint"""
    
    def test_sso_status_public_endpoint(self):
        """Test that SSO status is accessible without authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/auth/sso/status")
        assert response.status_code == 200, f"SSO status failed: {response.text}"
        data = response.json()
        
        assert "google_enabled" in data
        assert "microsoft_enabled" in data
        # Both should be false since no keys are configured
        assert data["google_enabled"] == False, "Google SSO should be disabled (no keys)"
        assert data["microsoft_enabled"] == False, "Microsoft SSO should be disabled (no keys)"
        print(f"SSO status: google_enabled={data['google_enabled']}, microsoft_enabled={data['microsoft_enabled']}")


class TestCrontabAuth:
    """Test that crontab endpoints require admin authentication"""
    
    def test_crontabs_require_auth(self):
        """Test that crontab endpoints require authentication"""
        session = requests.Session()
        
        # GET /api/crontabs without auth
        response = session.get(f"{BASE_URL}/api/crontabs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        # POST /api/crontabs without auth
        response = session.post(f"{BASE_URL}/api/crontabs", json={
            "name": "Test",
            "type": "sftp_scan",
            "schedule": "*/30 * * * *"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        # GET /api/scheduler/status without auth
        response = session.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print("All crontab endpoints correctly require authentication")
    
    def test_crontabs_require_admin_role(self):
        """Test that crontab endpoints require admin role (not just manager)"""
        session = requests.Session()
        
        # Login as manager
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manager@example.com",
            "password": "Manager123!"
        })
        # If manager doesn't exist, skip this test
        if login_response.status_code != 200:
            pytest.skip("Manager account not available")
        
        # Try to access crontabs as manager
        response = session.get(f"{BASE_URL}/api/crontabs")
        assert response.status_code == 403, f"Expected 403 for manager, got {response.status_code}"
        print("Crontab endpoints correctly require admin role")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
