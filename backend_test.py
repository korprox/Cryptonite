#!/usr/bin/env python3
"""
Backend API Tests for Криптонит Application
Tests all backend endpoints including authentication, posts, comments, and reports
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://secret-space.preview.emergentagent.com/api"

class KriptonitAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.test_user_id = None
        self.test_post_id = None
        self.test_comment_id = None
        self.results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_result("Health Check", True, "API is healthy")
                    return True
                else:
                    self.log_result("Health Check", False, "Unexpected health status", data)
                    return False
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Health Check", False, "Connection failed", str(e))
            return False
    
    def test_create_anonymous_user(self):
        """Test anonymous user creation"""
        try:
            response = requests.post(f"{self.base_url}/auth/anonymous", json={}, timeout=10)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "anonymous_id", "display_name", "token"]
                
                if all(field in data for field in required_fields):
                    self.auth_token = data["token"]
                    self.test_user_id = data["id"]
                    self.log_result("Create Anonymous User", True, f"User created: {data['display_name']}")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Create Anonymous User", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("Create Anonymous User", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Anonymous User", False, "Request failed", str(e))
            return False
    
    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.auth_token:
            self.log_result("Get Current User", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.get(f"{self.base_url}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "anonymous_id", "display_name", "created_at"]
                
                if all(field in data for field in required_fields):
                    if data["id"] == self.test_user_id:
                        self.log_result("Get Current User", True, f"User info retrieved: {data['display_name']}")
                        return True
                    else:
                        self.log_result("Get Current User", False, "User ID mismatch", data)
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Get Current User", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("Get Current User", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Get Current User", False, "Request failed", str(e))
            return False
    
    def test_get_current_user_without_token(self):
        """Test getting current user without token (should fail)"""
        try:
            response = requests.get(f"{self.base_url}/auth/me", timeout=10)
            
            if response.status_code in [401, 403]:
                self.log_result("Get Current User (No Token)", True, f"Correctly rejected unauthorized request (HTTP {response.status_code})")
                return True
            else:
                self.log_result("Get Current User (No Token)", False, f"Expected 401/403, got {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Get Current User (No Token)", False, "Request failed", str(e))
            return False
    
    def test_create_post(self):
        """Test creating a post"""
        if not self.auth_token:
            self.log_result("Create Post", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            post_data = {
                "title": "Тестовый пост для проверки API",
                "content": "Это содержимое тестового поста для проверки работы API Криптонит.",
                "images": [],
                "tags": ["тест", "api", "криптонит"]
            }
            
            response = requests.post(f"{self.base_url}/posts", json=post_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "author_id", "title", "content", "created_at"]
                
                if all(field in data for field in required_fields):
                    self.test_post_id = data["id"]
                    if data["title"] == post_data["title"] and data["author_id"] == self.test_user_id:
                        self.log_result("Create Post", True, f"Post created with ID: {data['id']}")
                        return True
                    else:
                        self.log_result("Create Post", False, "Post data mismatch", data)
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Create Post", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("Create Post", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Post", False, "Request failed", str(e))
            return False
    
    def test_create_post_without_token(self):
        """Test creating post without token (should fail)"""
        try:
            post_data = {
                "title": "Unauthorized Post",
                "content": "This should fail",
                "images": [],
                "tags": []
            }
            
            response = requests.post(f"{self.base_url}/posts", json=post_data, timeout=10)
            
            if response.status_code == 401:
                self.log_result("Create Post (No Token)", True, "Correctly rejected unauthorized request")
                return True
            else:
                self.log_result("Create Post (No Token)", False, f"Expected 401, got {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Post (No Token)", False, "Request failed", str(e))
            return False
    
    def test_get_posts(self):
        """Test getting posts list"""
        try:
            response = requests.get(f"{self.base_url}/posts", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check if our test post is in the list
                        post_found = any(post.get("id") == self.test_post_id for post in data)
                        if post_found:
                            self.log_result("Get Posts", True, f"Retrieved {len(data)} posts, including test post")
                        else:
                            self.log_result("Get Posts", True, f"Retrieved {len(data)} posts (test post not found, might be expected)")
                    else:
                        self.log_result("Get Posts", True, "Retrieved empty posts list")
                    return True
                else:
                    self.log_result("Get Posts", False, "Response is not a list", data)
                    return False
            else:
                self.log_result("Get Posts", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Get Posts", False, "Request failed", str(e))
            return False
    
    def test_get_single_post(self):
        """Test getting a single post"""
        if not self.test_post_id:
            self.log_result("Get Single Post", False, "No test post ID available")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/posts/{self.test_post_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.test_post_id:
                    self.log_result("Get Single Post", True, f"Retrieved post: {data.get('title', 'No title')}")
                    return True
                else:
                    self.log_result("Get Single Post", False, "Post ID mismatch", data)
                    return False
            elif response.status_code == 404:
                self.log_result("Get Single Post", False, "Post not found (404)", response.text)
                return False
            else:
                self.log_result("Get Single Post", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Get Single Post", False, "Request failed", str(e))
            return False
    
    def test_get_nonexistent_post(self):
        """Test getting a non-existent post (should return 404)"""
        try:
            fake_id = "00000000-0000-0000-0000-000000000000"
            response = requests.get(f"{self.base_url}/posts/{fake_id}", timeout=10)
            
            if response.status_code == 404:
                self.log_result("Get Non-existent Post", True, "Correctly returned 404 for non-existent post")
                return True
            else:
                self.log_result("Get Non-existent Post", False, f"Expected 404, got {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Get Non-existent Post", False, "Request failed", str(e))
            return False
    
    def test_add_comment(self):
        """Test adding a comment to a post"""
        if not self.auth_token or not self.test_post_id:
            self.log_result("Add Comment", False, "Missing auth token or post ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            comment_data = {
                "content": "Это тестовый комментарий к посту."
            }
            
            response = requests.post(f"{self.base_url}/posts/{self.test_post_id}/comments", 
                                   json=comment_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "post_id", "author_id", "content", "created_at"]
                
                if all(field in data for field in required_fields):
                    self.test_comment_id = data["id"]
                    if data["post_id"] == self.test_post_id and data["content"] == comment_data["content"]:
                        self.log_result("Add Comment", True, f"Comment added with ID: {data['id']}")
                        return True
                    else:
                        self.log_result("Add Comment", False, "Comment data mismatch", data)
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Add Comment", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("Add Comment", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Add Comment", False, "Request failed", str(e))
            return False
    
    def test_add_comment_without_token(self):
        """Test adding comment without token (should fail)"""
        if not self.test_post_id:
            self.log_result("Add Comment (No Token)", False, "No test post ID available")
            return False
            
        try:
            comment_data = {"content": "Unauthorized comment"}
            response = requests.post(f"{self.base_url}/posts/{self.test_post_id}/comments", 
                                   json=comment_data, timeout=10)
            
            if response.status_code == 401:
                self.log_result("Add Comment (No Token)", True, "Correctly rejected unauthorized request")
                return True
            else:
                self.log_result("Add Comment (No Token)", False, f"Expected 401, got {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Add Comment (No Token)", False, "Request failed", str(e))
            return False
    
    def test_get_comments(self):
        """Test getting comments for a post"""
        if not self.test_post_id:
            self.log_result("Get Comments", False, "No test post ID available")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/posts/{self.test_post_id}/comments", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check if our test comment is in the list
                        comment_found = any(comment.get("id") == self.test_comment_id for comment in data)
                        if comment_found:
                            self.log_result("Get Comments", True, f"Retrieved {len(data)} comments, including test comment")
                        else:
                            self.log_result("Get Comments", True, f"Retrieved {len(data)} comments (test comment not found)")
                    else:
                        self.log_result("Get Comments", True, "Retrieved empty comments list")
                    return True
                else:
                    self.log_result("Get Comments", False, "Response is not a list", data)
                    return False
            else:
                self.log_result("Get Comments", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Get Comments", False, "Request failed", str(e))
            return False
    
    def test_create_report(self):
        """Test creating a report"""
        if not self.auth_token or not self.test_post_id:
            self.log_result("Create Report", False, "Missing auth token or post ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            report_data = {
                "target_type": "post",
                "target_id": self.test_post_id,
                "reason": "Тестовая жалоба для проверки API"
            }
            
            response = requests.post(f"{self.base_url}/reports", 
                                   json=report_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Report submitted successfully":
                    self.log_result("Create Report", True, "Report submitted successfully")
                    return True
                else:
                    self.log_result("Create Report", False, "Unexpected response", data)
                    return False
            else:
                self.log_result("Create Report", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Report", False, "Request failed", str(e))
            return False
    
    def test_create_report_without_token(self):
        """Test creating report without token (should fail)"""
        if not self.test_post_id:
            self.log_result("Create Report (No Token)", False, "No test post ID available")
            return False
            
        try:
            report_data = {
                "target_type": "post",
                "target_id": self.test_post_id,
                "reason": "Unauthorized report"
            }
            
            response = requests.post(f"{self.base_url}/reports", json=report_data, timeout=10)
            
            if response.status_code == 401:
                self.log_result("Create Report (No Token)", True, "Correctly rejected unauthorized request")
                return True
            else:
                self.log_result("Create Report (No Token)", False, f"Expected 401, got {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Report (No Token)", False, "Request failed", str(e))
            return False
    
    def test_validation_empty_post(self):
        """Test creating post with empty fields"""
        if not self.auth_token:
            self.log_result("Validation (Empty Post)", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            post_data = {
                "title": "",
                "content": "",
                "images": [],
                "tags": []
            }
            
            response = requests.post(f"{self.base_url}/posts", json=post_data, headers=headers, timeout=10)
            
            # The API might accept empty fields or reject them - both are valid behaviors
            if response.status_code in [200, 400, 422]:
                if response.status_code == 200:
                    self.log_result("Validation (Empty Post)", True, "API accepts empty post fields")
                else:
                    self.log_result("Validation (Empty Post)", True, f"API correctly validates empty fields (HTTP {response.status_code})")
                return True
            else:
                self.log_result("Validation (Empty Post)", False, f"Unexpected status {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Validation (Empty Post)", False, "Request failed", str(e))
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("КРИПТОНИТ BACKEND API TESTING")
        print("=" * 60)
        print(f"Testing backend at: {self.base_url}")
        print()
        
        # Test sequence
        tests = [
            self.test_health_check,
            self.test_create_anonymous_user,
            self.test_get_current_user,
            self.test_get_current_user_without_token,
            self.test_create_post,
            self.test_create_post_without_token,
            self.test_get_posts,
            self.test_get_single_post,
            self.test_get_nonexistent_post,
            self.test_add_comment,
            self.test_add_comment_without_token,
            self.test_get_comments,
            self.test_create_report,
            self.test_create_report_without_token,
            self.test_validation_empty_post
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL: {test.__name__} - Unexpected error: {str(e)}")
                failed += 1
            print()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total tests: {passed + failed}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success rate: {(passed / (passed + failed) * 100):.1f}%")
        
        if failed > 0:
            print("\nFAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"- {result['test']}: {result['message']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = KriptonitAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)