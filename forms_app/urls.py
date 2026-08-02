from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    FormViewSet,
    FormVersionViewSet,
    FieldViewSet,
    FieldOptionViewSet,
    ConditionalRuleViewSet,
    SubmissionViewSet,
    ResponseValueViewSet,
)

router = DefaultRouter()

router.register(r'forms', FormViewSet)
router.register(r'form-versions', FormVersionViewSet)
router.register(r'fields', FieldViewSet)
router.register(r'field-options', FieldOptionViewSet)
router.register(r'conditional-rules', ConditionalRuleViewSet)
router.register(r'submissions', SubmissionViewSet)
router.register(r'response-values', ResponseValueViewSet)

urlpatterns = [
    path('', include(router.urls)),
]