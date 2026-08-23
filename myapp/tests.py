import json
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from myapp.models import Form, FormVersion, Field, OneTimeLink, Submission


class FormEngineTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_and_publish_form(self):
        # Create form
        response = self.client.post("/api/forms/", {
            "title": "Feedback Form",
            "description": "Customer feedback",
            "status": "draft",
            "fields": [
                {"id": 1, "label": "Name", "type": "text", "required": True},
                {"id": 2, "label": "Rating", "type": "rating", "required": False}
            ]
        }, format="json")
        self.assertEqual(response.status_code, 201)
        form_id = response.data["id"]

        # Publish form
        pub_response = self.client.post(f"/api/forms/{form_id}/publish/", {}, format="json")
        self.assertEqual(pub_response.status_code, 200)

        # Check version created
        version = FormVersion.objects.filter(form_id=form_id, is_published=True).first()
        self.assertIsNotNone(version)

        # Public retrieval
        public_res = self.client.get(f"/api/public/{version.uuid}/")
        self.assertEqual(public_res.status_code, 200)
        self.assertEqual(public_res.data["form_name"], "Feedback Form")

    def test_one_time_link_generation(self):
        form = Form.objects.create(owner=self.user, title="One-Time Form", description="Test", status="published")
        version = FormVersion.objects.create(form=form, version=1, is_published=True)

        create_res = self.client.post(f"/api/one-time/create/{version.uuid}/", format="json")
        self.assertEqual(create_res.status_code, 201)
        res_data = json.loads(create_res.content)
        token = res_data["token"]

        # Retrieve one-time form
        get_res = self.client.get(f"/api/one-time/{token}/")
        self.assertEqual(get_res.status_code, 200)
        get_data = json.loads(get_res.content)
        self.assertEqual(get_data["form_name"], "One-Time Form")


