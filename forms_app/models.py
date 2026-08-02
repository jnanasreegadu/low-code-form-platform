from django.db import models


class Form(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class FormVersion(models.Model):
    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField()
    published_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.form.title} - Version {self.version_number}"


class Field(models.Model):
    FIELD_TYPES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('email', 'Email'),
        ('dropdown', 'Dropdown'),
        ('checkbox', 'Multi Checkbox'),
        ('date', 'Date'),
        ('file', 'File Upload'),
        ('rating', 'Rating'),
    ]

    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name='fields'
    )

    label = models.CharField(max_length=255)

    field_type = models.CharField(
        max_length=20,
        choices=FIELD_TYPES
    )

    required = models.BooleanField(default=False)
    placeholder = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=1)

    # Text validation
    min_length = models.PositiveIntegerField(null=True, blank=True)
    max_length = models.PositiveIntegerField(null=True, blank=True)

    # Number validation
    min_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    max_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    allow_decimal = models.BooleanField(default=True)

    # Date validation
    min_date = models.DateField(null=True, blank=True)
    max_date = models.DateField(null=True, blank=True)

    # File upload validation
    allowed_file_types = models.CharField(max_length=255, blank=True)
    max_file_size = models.PositiveIntegerField(null=True, blank=True)

    # Rating validation
    rating_scale = models.PositiveIntegerField(default=5)

    def __str__(self):
        return self.label


class FieldOption(models.Model):
    field = models.ForeignKey(
        Field,
        on_delete=models.CASCADE,
        related_name='options'
    )

    value = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.value


class ConditionalRule(models.Model):
    field = models.ForeignKey(
        Field,
        on_delete=models.CASCADE,
        related_name='conditional_rules'
    )

    depends_on = models.ForeignKey(
        Field,
        on_delete=models.CASCADE,
        related_name='dependent_rules'
    )

    expected_value = models.CharField(max_length=255)

    ACTION_CHOICES = [
        ('show', 'Show'),
        ('hide', 'Hide'),
    ]

    action = models.CharField(
        max_length=10,
        choices=ACTION_CHOICES,
        default='show'
    )

    def __str__(self):
        return (
            f"If {self.depends_on.label} = "
            f"{self.expected_value}, "
            f"{self.action} {self.field.label}"
        )


class Submission(models.Model):
    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name='submissions'
    )

    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.form.title} - Submission {self.id}"


class ResponseValue(models.Model):
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name='responses'
    )

    field = models.ForeignKey(
        Field,
        on_delete=models.CASCADE,
        related_name='responses'
    )

    value = models.TextField()

    def __str__(self):
        return f"{self.field.label}: {self.value}"