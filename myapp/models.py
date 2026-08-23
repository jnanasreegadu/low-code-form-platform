from django.db import models
import uuid
from django.contrib.auth.models import User


# ==========================================================
# FORM
# ==========================================================
class Form(models.Model):

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="forms",
        null=True,
        blank=True
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    retention_days = models.IntegerField(
        default=365,
        null=True,
        blank=True
    )

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("scheduled", "Scheduled"),   # NEW
        ("published", "Published"),
        ("archived", "Archived"),
    ]
    scheduled_publish_at = models.DateTimeField(
    null=True,
    blank=True
     )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft"
    )
    limit_one_response_per_email = models.BooleanField(
        default=False
    )

    # NEW — when set + status == "scheduled", the form becomes
    # publicly available automatically once this time passes.
    scheduled_publish_at = models.DateTimeField(
        null=True,
        blank=True
    )

    Fields = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)


# ==========================================================
# FORM VERSION
# ==========================================================

class FormVersion(models.Model):
    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE
    )

    version = models.IntegerField(default=1)

    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True
    )

    is_published = models.BooleanField(default=False)

    # PUBLIC FORM EXPIRY
    expires_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.form.title} - V{self.version}"

# ==========================================================
# FIELD
# ==========================================================

FIELD_TYPES = [
    ("text", "Text"),
    ("number", "Number"),
    ("email", "Email"),
    ("dropdown", "Dropdown"),
    ("checkbox", "Checkbox"),
    ("multicheckbox", "Multi Checkbox"),
    ("date", "Date"),
    ("file", "File Upload"),
    ("rating", "Rating"),
]


class Field(models.Model):
    form_version = models.ForeignKey(
        FormVersion,
        on_delete=models.CASCADE
    )

    label = models.CharField(max_length=255)

    field_type = models.CharField(
        max_length=30,
        choices=FIELD_TYPES,
        default="text"
    )

    placeholder = models.CharField(
        max_length=255,
        blank=True
    )

    is_required = models.BooleanField(default=False)

    min_length = models.IntegerField(
        null=True,
        blank=True
    )

    max_length = models.IntegerField(
        null=True,
        blank=True
    )
    min_value = models.FloatField(
    null=True,
    blank=True
    )

    max_value = models.FloatField(
        null=True,
        blank=True
    )
    min_date = models.DateField(
    null=True,
    blank=True
)

    max_date = models.DateField(
    null=True,
    blank=True
)

    field_order = models.IntegerField(default=1)
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.label


# ==========================================================
# FIELD OPTIONS
# ==========================================================

class FieldOption(models.Model):
    field = models.ForeignKey(
        Field,
        on_delete=models.CASCADE
    )

    option_text = models.CharField(
        max_length=255
    )

    option_order = models.IntegerField(
        default=1
    )

    def __str__(self):
        return self.option_text


# ==========================================================
# CONDITIONAL RULE
# ==========================================================

class ConditionalRule(models.Model):
    source_field = models.ForeignKey(
        Field,
        on_delete=models.CASCADE,
        related_name="source_rules"
    )

    operator = models.CharField(
        max_length=20,
        default="equals"
    )

    expected_value = models.CharField(
        max_length=255
    )

    target_field = models.ForeignKey(
        Field,
        on_delete=models.CASCADE,
        related_name="target_rules"
    )

    action = models.CharField(
        max_length=20,
        default="show"
    )

    def __str__(self):
        return f"{self.source_field} -> {self.target_field}"


# ==========================================================
# SUBMISSION
# ==========================================================

class Submission(models.Model):
    form_version = models.ForeignKey(
        FormVersion,
        on_delete=models.CASCADE
    )

    submitted_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completion_time_seconds = models.FloatField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    status = models.CharField(max_length=20, default="submitted")

    # NEW: verified respondent identity, independent of any
    # Email-type form field. Set only after Google sign-in +
    # OTP verification succeed.
    respondent_email = models.EmailField(null=True, blank=True)
    respondent_email_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"Submission {self.id}"
# ==========================================================
# OTP VERIFICATION (respondent identity, not admin login)
# ==========================================================

class OTPVerification(models.Model):
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name="otp_verifications"
    )

    email = models.EmailField()
    code = models.CharField(max_length=6)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    verified = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)

    def __str__(self):
        return f"OTP for {self.email} (submission {self.submission_id})"

# ==========================================================
# AUDIT LOG
# ==========================================================

class AuditLog(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    action = models.CharField(
        max_length=50
    )

    affected_submissions = models.JSONField(
        default=list
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.action} - {self.user}"


# ==========================================================
# RESPONSE VALUE
# ==========================================================

class ResponseValue(models.Model):
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE
    )

    field = models.ForeignKey(
        Field,
        on_delete=models.CASCADE
    )

    value = models.TextField()

    def __str__(self):
        return self.value


# ==========================================================
# UPLOADED FILE
# ==========================================================

class UploadedFile(models.Model):
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE
    )

    field = models.ForeignKey(
        Field,
        on_delete=models.CASCADE
    )

    file = models.FileField(
        upload_to="form_uploads/"
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.file.name
class OneTimeLink(models.Model):

    form_version = models.ForeignKey(
        FormVersion,
        on_delete=models.CASCADE,
        related_name="one_time_links"
    )

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    used = models.BooleanField(
        default=False
    )

    used_at = models.DateTimeField(
        null=True,
        blank=True
    )

    expires_at = models.DateTimeField(
        null=True,
        blank=True
    )

    submission = models.OneToOneField(
        Submission,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="one_time_link"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"One-Time Link - {self.form_version.form.title}"