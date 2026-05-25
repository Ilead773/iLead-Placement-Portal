import random
import uuid
from locust import HttpUser, task, between

class InterviewUser(HttpUser):
    wait_time = between(2, 5)  # Simulate thinking time
    
    def on_start(self):
        """
        Simulate login and getting a token.
        """
        # Replace with your test credentials
        response = self.client.post("/api/v1/auth/login/", json={
            "email": "student@example.com",
            "password": "password123"
        })
        if response.status_code == 200:
            self.token = response.json().get("access")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.headers = {}

    @task
    def simulate_complete_interview(self):
        if not hasattr(self, 'token'):
            return

        # 1. Start Interview
        start_payload = {
            "interview_type_id": "", # Will be filled below
            "use_voice": True
        }
        
        # Get types first to be realistic
        types_res = self.client.get("/api/v1/interviews/types/", headers=self.headers)
        if types_res.status_code == 200 and types_res.json():
            type_id = types_res.json()[0]['id']
            start_payload["interview_type_id"] = type_id
        else:
            return

        res = self.client.post("/api/v1/interviews/start/", json=start_payload, headers=self.headers)
        if res.status_code != 200:
            return
        
        session_id = res.json().get("session_id")
        total_questions = res.json().get("total_questions", 5)

        # 2. Answer Questions
        for i in range(1, total_questions + 1):
            # Simulate a 10-20 second thinking time
            self.wait_time = between(10, 20) 
            
            answer_payload = {
                "session_id": session_id,
                "question_number": i,
                "answer_text": f"This is a simulated load test answer for question {i}. High concurrency testing.",
                "time_taken_seconds": random.randint(30, 60)
            }
            
            # Submit Answer
            submit_res = self.client.post("/api/v1/interviews/submit-answer/", json=answer_payload, headers=self.headers)
            if submit_res.status_code == 200:
                answer_id = submit_res.json().get("answer_id")
                
                # 3. Poll for results
                while True:
                    poll_res = self.client.get(f"/api/v1/interviews/check-answer-status/{answer_id}/", headers=self.headers)
                    if poll_res.status_code == 200:
                        status = poll_res.json().get("status")
                        if status == "done":
                            break
                    
                    import time
                    time.sleep(2)
            else:
                break
