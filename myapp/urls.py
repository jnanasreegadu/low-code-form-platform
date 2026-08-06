from rest_framework.routers import DefaultRouter
from .views import (
    FormViewSet,
    FieldViewSet,
    SubmissionViewSet,
    ConditionalRuleViewSet,
)
from .views import public_form_by_uuid
from django.urls import path, include
from .views import LoginView
router = DefaultRouter()
router.register(r'forms', FormViewSet)
router.register(r'fields', FieldViewSet)
router.register(r'submissions', SubmissionViewSet)
router.register(r'conditional-rules', ConditionalRuleViewSet)
urlpatterns = [
    path("", include(router.urls)),
    path("login/", LoginView.as_view(), name="login"),
    path("public/<uuid:uuid>/", public_form_by_uuid),
]
