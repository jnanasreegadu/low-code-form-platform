from rest_framework.routers import DefaultRouter
from .views import (
    FormViewSet,
    FieldViewSet,
    SubmissionViewSet,
    ConditionalRuleViewSet,
)
from .views import (
    public_form_by_uuid,
    start_public_form,
    create_one_time_link,
    one_time_form,
    start_one_time_submission,
    submit_one_time_submission,
    set_public_form_expiry,
)
from .views import AIGenerateFormView
from .views import (
    LoginView,
    RegisterView,
    ProfileView,
    GoogleLoginView,
    RespondentGoogleVerifyView,
    RespondentSendOTPView,
    RespondentVerifyOTPView,
)
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import LoginView, RegisterView, ProfileView, GoogleLoginView
router = DefaultRouter()
router.register(r'forms', FormViewSet)
router.register(r'fields', FieldViewSet)
router.register(r'submissions', SubmissionViewSet)
router.register(r'conditional-rules', ConditionalRuleViewSet)
urlpatterns = [
    path("", include(router.urls)),
    path("login/", LoginView.as_view(), name="login"),
    path("google-login/", GoogleLoginView.as_view(), name="google-login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("public/<uuid:uuid>/", public_form_by_uuid),
    path("profile/", ProfileView.as_view(), name="profile"),
    path(
    "one-time/create/<uuid:uuid>/",
    create_one_time_link,
    name="create-one-time-link"
),

path(
    "one-time/<uuid:token>/",
    one_time_form,
    name="one-time-form"
),

path(
    "one-time/<uuid:token>/start/",
    start_one_time_submission,
    name="start-one-time-submission"
),
    path(
    "public/<uuid:uuid>/start/",
    start_public_form,
),
    path(
    "one-time/<uuid:token>/submit/",
    submit_one_time_submission,
    name="submit-one-time-submission"
),
    path(
    "public/<uuid:uuid>/expiry/",
    set_public_form_expiry,
    name="set-public-form-expiry"
),
    path(
        "respondent/google-verify/",
        RespondentGoogleVerifyView.as_view(),
        name="respondent-google-verify"
    ),
    path(
        "respondent/otp/send/",
        RespondentSendOTPView.as_view(),
        name="respondent-send-otp"
    ),
    path(
        "respondent/otp/verify/",
        RespondentVerifyOTPView.as_view(),
        name="respondent-verify-otp"
    ),
    path(
        "ai/generate-form/",
        AIGenerateFormView.as_view(),
        name="ai-generate-form"
    ),
]
urlpatterns += static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT
)