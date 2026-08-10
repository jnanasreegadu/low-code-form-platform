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

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft"
    )

    Fields = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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

    submitted_at = models.DateTimeField(
        auto_now_add=True
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        default="submitted"
    )

    def __str__(self):
        return f"Submission {self.id}"


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