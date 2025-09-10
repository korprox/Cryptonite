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
        # Phase 4: Chat and Call testing variables
        self.auth_token_2 = None
        self.test_user_id_2 = None
        self.test_chat_id = None
        self.test_message_id = None
        self.test_call_id = None
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
            
            if response.status_code in [401, 403]:
                self.log_result("Create Post (No Token)", True, f"Correctly rejected unauthorized request (HTTP {response.status_code})")
                return True
            else:
                self.log_result("Create Post (No Token)", False, f"Expected 401/403, got {response.status_code}", response.text)
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
            
            if response.status_code in [401, 403]:
                self.log_result("Add Comment (No Token)", True, f"Correctly rejected unauthorized request (HTTP {response.status_code})")
                return True
            else:
                self.log_result("Add Comment (No Token)", False, f"Expected 401/403, got {response.status_code}", response.text)
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
            
            if response.status_code in [401, 403]:
                self.log_result("Create Report (No Token)", True, f"Correctly rejected unauthorized request (HTTP {response.status_code})")
                return True
            else:
                self.log_result("Create Report (No Token)", False, f"Expected 401/403, got {response.status_code}", response.text)
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
    
    # Phase 4: Chat and Audio Call Tests
    
    def test_create_second_anonymous_user(self):
        """Create second anonymous user for chat testing"""
        try:
            response = requests.post(f"{self.base_url}/auth/anonymous", json={}, timeout=10)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "anonymous_id", "display_name", "token"]
                
                if all(field in data for field in required_fields):
                    self.auth_token_2 = data["token"]
                    self.test_user_id_2 = data["id"]
                    self.log_result("Create Second Anonymous User", True, f"Second user created: {data['display_name']}")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Create Second Anonymous User", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("Create Second Anonymous User", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Second Anonymous User", False, "Request failed", str(e))
            return False
    
    def test_create_chat(self):
        """Test creating a chat between two users"""
        if not self.auth_token or not self.test_user_id_2:
            self.log_result("Create Chat", False, "Missing auth token or second user ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            chat_data = {
                "receiver_id": self.test_user_id_2
            }
            
            response = requests.post(f"{self.base_url}/chats", json=chat_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "participants", "created_at", "is_active"]
                
                if all(field in data for field in required_fields):
                    self.test_chat_id = data["id"]
                    if (self.test_user_id in data["participants"] and 
                        self.test_user_id_2 in data["participants"] and
                        data["is_active"]):
                        self.log_result("Create Chat", True, f"Chat created with ID: {data['id']}")
                        return True
                    else:
                        self.log_result("Create Chat", False, "Chat participants or status incorrect", data)
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Create Chat", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("Create Chat", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Chat", False, "Request failed", str(e))
            return False
    
    def test_get_user_chats(self):
        """Test getting user's chats"""
        if not self.auth_token:
            self.log_result("Get User Chats", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.get(f"{self.base_url}/chats", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check if our test chat is in the list
                        chat_found = any(chat.get("id") == self.test_chat_id for chat in data)
                        if chat_found:
                            self.log_result("Get User Chats", True, f"Retrieved {len(data)} chats, including test chat")
                        else:
                            self.log_result("Get User Chats", True, f"Retrieved {len(data)} chats (test chat not found)")
                    else:
                        self.log_result("Get User Chats", True, "Retrieved empty chats list")
                    return True
                else:
                    self.log_result("Get User Chats", False, "Response is not a list", data)
                    return False
            else:
                self.log_result("Get User Chats", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Get User Chats", False, "Request failed", str(e))
            return False
    
    def test_send_message(self):
        """Test sending a message in chat"""
        if not self.auth_token or not self.test_chat_id:
            self.log_result("Send Message", False, "Missing auth token or chat ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            message_data = {
                "content": "Привет! Это тестовое сообщение в чате."
            }
            
            response = requests.post(f"{self.base_url}/chats/{self.test_chat_id}/messages", 
                                   json=message_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "chat_id", "sender_id", "content", "created_at"]
                
                if all(field in data for field in required_fields):
                    self.test_message_id = data["id"]
                    if (data["chat_id"] == self.test_chat_id and 
                        data["sender_id"] == self.test_user_id and
                        data["content"] == message_data["content"]):
                        self.log_result("Send Message", True, f"Message sent with ID: {data['id']}")
                        return True
                    else:
                        self.log_result("Send Message", False, "Message data mismatch", data)
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Send Message", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("Send Message", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Send Message", False, "Request failed", str(e))
            return False
    
    def test_get_chat_messages(self):
        """Test getting messages from chat"""
        if not self.auth_token or not self.test_chat_id:
            self.log_result("Get Chat Messages", False, "Missing auth token or chat ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.get(f"{self.base_url}/chats/{self.test_chat_id}/messages", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check if our test message is in the list
                        message_found = any(msg.get("id") == self.test_message_id for msg in data)
                        if message_found:
                            self.log_result("Get Chat Messages", True, f"Retrieved {len(data)} messages, including test message")
                        else:
                            self.log_result("Get Chat Messages", True, f"Retrieved {len(data)} messages (test message not found)")
                    else:
                        self.log_result("Get Chat Messages", True, "Retrieved empty messages list")
                    return True
                else:
                    self.log_result("Get Chat Messages", False, "Response is not a list", data)
                    return False
            else:
                self.log_result("Get Chat Messages", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Get Chat Messages", False, "Request failed", str(e))
            return False
    
    def test_create_call_request(self):
        """Test creating a call request"""
        if not self.auth_token or not self.test_chat_id:
            self.log_result("Create Call Request", False, "Missing auth token or chat ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.post(f"{self.base_url}/chats/{self.test_chat_id}/call-request", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "chat_id", "caller_id", "receiver_id", "status", "created_at"]
                
                if all(field in data for field in required_fields):
                    self.test_call_id = data["id"]
                    if (data["chat_id"] == self.test_chat_id and 
                        data["caller_id"] == self.test_user_id and
                        data["receiver_id"] == self.test_user_id_2 and
                        data["status"] == "pending"):
                        self.log_result("Create Call Request", True, f"Call request created with ID: {data['id']}")
                        return True
                    else:
                        self.log_result("Create Call Request", False, "Call request data mismatch", data)
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Create Call Request", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("Create Call Request", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Call Request", False, "Request failed", str(e))
            return False
    
    def test_respond_to_call_accept(self):
        """Test accepting a call request"""
        if not self.auth_token_2 or not self.test_call_id:
            self.log_result("Respond to Call (Accept)", False, "Missing second user token or call ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token_2}"}
            response_data = {
                "action": "accept"
            }
            
            response = requests.post(f"{self.base_url}/call-requests/{self.test_call_id}/respond", 
                                   json=response_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Call accepted":
                    self.log_result("Respond to Call (Accept)", True, "Call request accepted successfully")
                    return True
                else:
                    self.log_result("Respond to Call (Accept)", False, "Unexpected response", data)
                    return False
            else:
                self.log_result("Respond to Call (Accept)", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Respond to Call (Accept)", False, "Request failed", str(e))
            return False
    
    def test_webrtc_offer(self):
        """Test sending WebRTC offer"""
        if not self.auth_token or not self.test_chat_id:
            self.log_result("WebRTC Offer", False, "Missing auth token or chat ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            offer_data = {
                "chat_id": self.test_chat_id,
                "offer": {
                    "type": "offer",
                    "sdp": "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:test\r\na=ice-pwd:test\r\na=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00\r\na=setup:actpass\r\na=mid:0\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\n"
                }
            }
            
            response = requests.post(f"{self.base_url}/webrtc/offer", 
                                   json=offer_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Offer sent":
                    self.log_result("WebRTC Offer", True, "WebRTC offer sent successfully")
                    return True
                else:
                    self.log_result("WebRTC Offer", False, "Unexpected response", data)
                    return False
            else:
                self.log_result("WebRTC Offer", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("WebRTC Offer", False, "Request failed", str(e))
            return False
    
    def test_webrtc_get_offer(self):
        """Test getting WebRTC offer"""
        if not self.auth_token_2 or not self.test_chat_id:
            self.log_result("WebRTC Get Offer", False, "Missing second user token or chat ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token_2}"}
            response = requests.get(f"{self.base_url}/webrtc/offer/{self.test_chat_id}", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["offer", "caller_id"]
                
                if all(field in data for field in required_fields):
                    if data["caller_id"] == self.test_user_id:
                        self.log_result("WebRTC Get Offer", True, "WebRTC offer retrieved successfully")
                        return True
                    else:
                        self.log_result("WebRTC Get Offer", False, "Caller ID mismatch", data)
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("WebRTC Get Offer", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("WebRTC Get Offer", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("WebRTC Get Offer", False, "Request failed", str(e))
            return False
    
    def test_webrtc_answer(self):
        """Test sending WebRTC answer"""
        if not self.auth_token_2 or not self.test_chat_id:
            self.log_result("WebRTC Answer", False, "Missing second user token or chat ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token_2}"}
            answer_data = {
                "chat_id": self.test_chat_id,
                "answer": {
                    "type": "answer",
                    "sdp": "v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:test2\r\na=ice-pwd:test2\r\na=fingerprint:sha-256 11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11:11\r\na=setup:active\r\na=mid:0\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\n"
                }
            }
            
            response = requests.post(f"{self.base_url}/webrtc/answer", 
                                   json=answer_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Answer sent":
                    self.log_result("WebRTC Answer", True, "WebRTC answer sent successfully")
                    return True
                else:
                    self.log_result("WebRTC Answer", False, "Unexpected response", data)
                    return False
            else:
                self.log_result("WebRTC Answer", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("WebRTC Answer", False, "Request failed", str(e))
            return False
    
    def test_webrtc_get_answer(self):
        """Test getting WebRTC answer"""
        if not self.auth_token or not self.test_chat_id:
            self.log_result("WebRTC Get Answer", False, "Missing auth token or chat ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.get(f"{self.base_url}/webrtc/answer/{self.test_chat_id}", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["answer", "receiver_id"]
                
                if all(field in data for field in required_fields):
                    if data["receiver_id"] == self.test_user_id_2:
                        self.log_result("WebRTC Get Answer", True, "WebRTC answer retrieved successfully")
                        return True
                    else:
                        self.log_result("WebRTC Get Answer", False, "Receiver ID mismatch", data)
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("WebRTC Get Answer", False, f"Missing fields: {missing}", data)
                    return False
            else:
                self.log_result("WebRTC Get Answer", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("WebRTC Get Answer", False, "Request failed", str(e))
            return False
    
    def test_webrtc_ice_candidate(self):
        """Test sending ICE candidate"""
        if not self.auth_token or not self.test_chat_id:
            self.log_result("WebRTC ICE Candidate", False, "Missing auth token or chat ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            candidate_data = {
                "chat_id": self.test_chat_id,
                "candidate": {
                    "candidate": "candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host",
                    "sdpMLineIndex": 0,
                    "sdpMid": "0"
                }
            }
            
            response = requests.post(f"{self.base_url}/webrtc/ice-candidate", 
                                   json=candidate_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "ICE candidate sent":
                    self.log_result("WebRTC ICE Candidate", True, "ICE candidate sent successfully")
                    return True
                else:
                    self.log_result("WebRTC ICE Candidate", False, "Unexpected response", data)
                    return False
            else:
                self.log_result("WebRTC ICE Candidate", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("WebRTC ICE Candidate", False, "Request failed", str(e))
            return False
    
    def test_webrtc_get_ice_candidates(self):
        """Test getting ICE candidates"""
        if not self.auth_token_2 or not self.test_chat_id:
            self.log_result("WebRTC Get ICE Candidates", False, "Missing second user token or chat ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token_2}"}
            response = requests.get(f"{self.base_url}/webrtc/ice-candidates/{self.test_chat_id}", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check if candidates have required fields
                        candidate = data[0]
                        if "candidate" in candidate and "sender_id" in candidate:
                            self.log_result("WebRTC Get ICE Candidates", True, f"Retrieved {len(data)} ICE candidates")
                        else:
                            self.log_result("WebRTC Get ICE Candidates", False, "ICE candidate missing required fields", candidate)
                    else:
                        self.log_result("WebRTC Get ICE Candidates", True, "Retrieved empty ICE candidates list")
                    return True
                else:
                    self.log_result("WebRTC Get ICE Candidates", False, "Response is not a list", data)
                    return False
            else:
                self.log_result("WebRTC Get ICE Candidates", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("WebRTC Get ICE Candidates", False, "Request failed", str(e))
            return False
    
    def test_end_call(self):
        """Test ending a call"""
        if not self.auth_token or not self.test_call_id:
            self.log_result("End Call", False, "Missing auth token or call ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.post(f"{self.base_url}/call-requests/{self.test_call_id}/end", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "duration_minutes" in data:
                    if data["message"] == "Call ended":
                        self.log_result("End Call", True, f"Call ended successfully, duration: {data['duration_minutes']} minutes")
                        return True
                    else:
                        self.log_result("End Call", False, "Unexpected message", data)
                        return False
                else:
                    self.log_result("End Call", False, "Missing required fields in response", data)
                    return False
            else:
                self.log_result("End Call", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("End Call", False, "Request failed", str(e))
            return False
    
    def test_chat_authorization(self):
        """Test that users can only access their own chats"""
        if not self.auth_token or not self.test_chat_id:
            self.log_result("Chat Authorization", False, "Missing auth token or chat ID")
            return False
            
        try:
            # Create a third user
            response = requests.post(f"{self.base_url}/auth/anonymous", json={}, timeout=10)
            if response.status_code != 200:
                self.log_result("Chat Authorization", False, "Failed to create third user", response.text)
                return False
                
            third_user_token = response.json()["token"]
            
            # Try to access our chat with third user token (should fail)
            headers = {"Authorization": f"Bearer {third_user_token}"}
            response = requests.get(f"{self.base_url}/chats/{self.test_chat_id}/messages", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 404:
                self.log_result("Chat Authorization", True, "Correctly denied access to unauthorized chat")
                return True
            else:
                self.log_result("Chat Authorization", False, f"Expected 404, got {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Chat Authorization", False, "Request failed", str(e))
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
            # Phase 1: Basic functionality (already tested)
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
            self.test_validation_empty_post,
            
            # Phase 4: Chat and Audio Call functionality
            self.test_create_second_anonymous_user,
            self.test_create_chat,
            self.test_get_user_chats,
            self.test_send_message,
            self.test_get_chat_messages,
            self.test_create_call_request,
            self.test_respond_to_call_accept,
            self.test_webrtc_offer,
            self.test_webrtc_get_offer,
            self.test_webrtc_answer,
            self.test_webrtc_get_answer,
            self.test_webrtc_ice_candidate,
            self.test_webrtc_get_ice_candidates,
            self.test_end_call,
            self.test_chat_authorization
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