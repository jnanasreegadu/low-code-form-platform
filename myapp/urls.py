from rest_framework.routers import DefaultRouter
from .views import (
    FormViewSet,
    FieldViewSet,
    SubmissionViewSet,
    ConditionalRuleViewSet,
)
from .views import public_form_by_uuid, start_public_form
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import LoginView, RegisterView
router = DefaultRouter()
router.register(r'forms', FormViewSet)
router.register(r'fields', FieldViewSet)
router.register(r'submissions', SubmissionViewSet)
router.register(r'conditional-rules', ConditionalRuleViewSet)
urlpatterns = [
    path("", include(router.urls)),
    path("login/", LoginView.as_view(), name="login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("public/<uuid:uuid>/", public_form_by_uuid),
    path(
    "public/<uuid:uuid>/start/",
    start_public_form,
),
]
urlpatterns += static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT
)