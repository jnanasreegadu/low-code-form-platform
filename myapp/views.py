from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action,api_view
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework import status
import csv
import json
import secrets
import uuid
import os
import re
from datetime import timedelta
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.core import signing
from datetime import datetime
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
from django.http import HttpResponse
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    id_token = None
    google_requests = None

from django.conf import settings
import random
from .models import OTPVerification   # add to existing models import block
import logging
import requests

logger = logging.getLogger(__name__)
from .models import (
    Form,
    Field,
    FormVersion,
    FieldOption,
    Submission,
    ResponseValue,
    ConditionalRule,
    UploadedFile,
    AuditLog,
    OneTimeLink,
)


from .serializers import (
    FormSerializer,
    FieldSerializer,
    SubmissionSerializer,
    ConditionalRuleSerializer,
)
def auto_publish_due_scheduled_forms():
    """
    Find all forms with status='scheduled' whose scheduled_publish_at <= timezone.now()
    and automatically flip their status to 'published'.
    """
    try:
        now = timezone.now()
        Form.objects.filter(
            status="scheduled",
            scheduled_publish_at__isnull=False,
            scheduled_publish_at__lte=now
        ).update(status="published")
    except Exception as e:
        logger.warning(f"Note on auto-publishing scheduled forms: {e}")



class FormViewSet(viewsets.ModelViewSet):
    queryset = Form.objects.all()
    serializer_class = FormSerializer

    def get_queryset(self):
        auto_publish_due_scheduled_forms()

        if self.action == "public":
            return Form.objects.all()

        if not self.request.user.is_authenticated:
            return Form.objects.none()

        return Form.objects.filter(owner=self.request.user)

    def create(self, request):
        data = request.data

        # Create Form
        form = Form.objects.create(
            owner=request.user,
            title=data["title"],
            description=data["description"],
            status=data.get("status", "draft"),
            Fields=data.get("fields", []),
            limit_one_response_per_email=data.get(
                "limit_one_response_per_email", False
            ),
        )

        # Create Version 1
        version = FormVersion.objects.create(
            form=form,
            version=1,
            is_published=False
        )

        # Map frontend field IDs -> backend Field objects
        field_map = {}

        # Save fields into Field table
        for index, item in enumerate(data.get("fields", []), start=1):

            field = Field.objects.create(
                form_version=version,
                label=item["label"],
                field_type=item["type"].lower(),
                placeholder=item.get("placeholder", ""),
                is_required=item.get("required", False),
                min_length=item.get("minLength") or None,
                max_length=item.get("maxLength") or None,
                min_value=item.get("minValue") or None,
                max_value=item.get("maxValue") or None,
                min_date=item.get("minDate") or None,
                max_date=item.get("maxDate") or None,
                field_order=index,
            )

            # Save frontend ID -> backend Field
            field_map[str(item["id"])] = field

            # Save dropdown options
            if item.get("type", "").lower() in ["dropdown", "select", "multicheckbox"]:
                for i, option in enumerate(
                    item.get("options", []),
                    start=1
                ):
                    FieldOption.objects.create(
                        field=field,
                        option_text=option,
                        option_order=i,
                    )


        # =====================================================
        # SAVE CONDITIONAL RULES
        # =====================================================

        for rule in data.get("conditional_rules", []):

            source_field = field_map.get(
                str(rule.get("source_field_id"))
            )

            target_field = field_map.get(
                str(rule.get("target_field_id"))
            )

            if not source_field or not target_field:
                continue

            ConditionalRule.objects.create(
                source_field=source_field,
                operator=rule.get("operator", "equals"),
                expected_value=rule.get("expected_value", ""),
                target_field=target_field,
                action=rule.get("action", "show"),
            )

        # IMPORTANT: return must be OUTSIDE the loop
        return Response(
            FormSerializer(form).data,
            status=status.HTTP_201_CREATED,
        )
    def update(self, request, *args, **kwargs):

        print("========== UPDATE API HIT ==========")

        form = self.get_object()
        data = request.data

        print("FORM ID:", form.id)
        print("STATUS BEFORE:", form.status)
        print("UPDATE DATA:", data)

        # =====================================================
        # 1. UPDATE BASIC FORM DETAILS
        # =====================================================

        form.title = data.get("title", form.title)
        form.description = data.get("description", form.description)

        form.limit_one_response_per_email = data.get(
            "limit_one_response_per_email",
            form.limit_one_response_per_email
        )

        fields_data = data.get("Fields", data.get("fields", []))

        # Keep JSON copy also updated
        form.Fields = fields_data

        form.save()

        print("FIELDS RECEIVED:", len(fields_data))

        # =====================================================
        # 2. IF FORM IS PUBLISHED
        #    CREATE NEW VERSION
        # =====================================================

        if form.status == "published":

            print("ENTERED VERSION BLOCK")

            # Unpublish previous published version
            FormVersion.objects.filter(
                form=form,
                is_published=True
            ).update(is_published=False)

            # New version number
            latest_version = (
                FormVersion.objects
                .filter(form=form)
                .order_by("-version")
                .first()
            )

            version_no = (
                latest_version.version + 1
                if latest_version
                else 1
            )

            # Create new published version
            new_version = FormVersion.objects.create(
                form=form,
                version=version_no,
                is_published=True
            )

            print("NEW VERSION:", new_version.version)

            # =================================================
            # 3. CREATE NEW FIELDS
            # =================================================

            # Frontend ID -> NEW backend Field object
            field_map = {}

            for index, item in enumerate(
                fields_data,
                start=1
            ):

                new_field = Field.objects.create(
                    form_version=new_version,

                    label=item.get("label", ""),

                    field_type=item.get(
                        "type",
                        "text"
                    ).lower(),

                    placeholder=item.get(
                        "placeholder",
                        ""
                    ),

                    is_required=item.get(
                        "required",
                        False
                    ),

                    min_length=item.get(
                        "minLength"
                    ) or None,

                    max_length=item.get(
                        "maxLength"
                    ) or None,

                    min_value=item.get(
                        "minValue"
                    ) or None,

                    max_value=item.get(
                        "maxValue"
                    ) or None,

                    min_date=item.get(
                        "minDate"
                    ) or None,

                    max_date=item.get(
                        "maxDate"
                    ) or None,

                    field_order=index
                )

                # IMPORTANT
                # Map frontend field ID -> new backend field
                field_map[str(item["id"])] = new_field

                # Dropdown options
                if item.get("type", "").lower() in ["dropdown", "select", "multicheckbox"]:


                    for i, option in enumerate(
                        item.get("options", []),
                        start=1
                    ):

                        FieldOption.objects.create(
                            field=new_field,
                            option_text=option,
                            option_order=i
                        )

            print(
                "NEW FIELD COUNT:",
                len(field_map)
            )

            # =================================================
            # 4. SAVE CONDITIONAL RULES
            # =================================================

            conditional_rules = data.get(
                "conditional_rules",
                []
            )

            print(
                "INCOMING RULE COUNT:",
                len(conditional_rules)
            )

            # Delete rules for safety if any exist
            ConditionalRule.objects.filter(
                source_field__form_version=new_version
            ).delete()

            for rule in conditional_rules:

                source_field = field_map.get(
                    str(rule.get("source_field_id"))
                )

                target_field = field_map.get(
                    str(rule.get("target_field_id"))
                )

                # Skip invalid rules
                if not source_field or not target_field:
                    print(
                        "SKIPPING INVALID RULE:",
                        rule
                    )
                    continue

                ConditionalRule.objects.create(
                    source_field=source_field,

                    operator=rule.get(
                        "operator",
                        "equals"
                    ),

                    expected_value=rule.get(
                        "expected_value",
                        ""
                    ),

                    target_field=target_field,

                    action=rule.get(
                        "action",
                        "show"
                    )
                )

            print(
                "NEW RULE COUNT:",
                ConditionalRule.objects.filter(
                    source_field__form_version=new_version
                ).count()
            )

            # =================================================
            # 5. RETURN UPDATED FORM
            # =================================================

            return Response(
                FormSerializer(form).data,
                status=status.HTTP_200_OK
            )

        # =====================================================
        # 6. DRAFT FORM
        # =====================================================

        return Response(
            FormSerializer(form).data,
            status=status.HTTP_200_OK
        )


    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):

        form = self.get_object()

        # ------------------------------------------------------
        # OPTIONAL SCHEDULING
        # ------------------------------------------------------
        scheduled_publish_at = None
        raw_schedule = request.data.get("scheduled_publish_at")

        if raw_schedule:
            scheduled_publish_at = parse_datetime(raw_schedule)

            if scheduled_publish_at is None:
                return Response(
                    {"error": "Invalid scheduled_publish_at. Use an ISO datetime."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if timezone.is_naive(scheduled_publish_at):
                scheduled_publish_at = timezone.make_aware(scheduled_publish_at)

            if scheduled_publish_at <= timezone.now():
                return Response(
                    {"error": "scheduled_publish_at must be in the future."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        FormVersion.objects.filter(
            form=form,
            is_published=True
        ).update(is_published=False)

        # Publish (or schedule) form
        if scheduled_publish_at:
            form.status = "scheduled"
            form.scheduled_publish_at = scheduled_publish_at
        else:
            form.status = "published"
            form.scheduled_publish_at = None

        form.save()

        # Create new version — UNCHANGED from existing behavior.
        # This runs whether it's "publish now" or "schedule", so the
        # version/UUID exists up front and can be shared ahead of time.
        latest_version = FormVersion.objects.filter(form=form).count() + 1

        new_version = FormVersion.objects.create(
            form=form,
            version=latest_version,
            is_published=True,
        )
        field_map = {}
        for index, item in enumerate(form.Fields, start=1):

            new_field = Field.objects.create(
                form_version=new_version,
                label=item["label"],
                field_type=item["type"].lower(),
                placeholder=item.get("placeholder", ""),
                is_required=item.get("required", False),
                min_length=item.get("minLength") or None,
                max_length=item.get("maxLength") or None,
                min_value=item.get("minValue") or None,
                max_value=item.get("maxValue")  or None,
                min_date=item.get("minDate") or None,
                max_date=item.get("maxDate") or None,
                field_order=index,
            )
            field_map[str(item["id"])] = new_field

            if item.get("type", "").lower() in ["dropdown", "select", "multicheckbox"]:

                for i, option in enumerate(item.get("options", []), start=1):
                    FieldOption.objects.create(
                        field=new_field,
                        option_text=option,
                        option_order=i,
                    )

        old_version = (
            FormVersion.objects
            .filter(form=form)
            .exclude(id=new_version.id)
            .order_by("-version")
            .first()
        )

        if old_version:

            new_fields = {
                field.field_order: field
                for field in Field.objects.filter(
                    form_version=new_version
                )
            }

            rules = ConditionalRule.objects.filter(
                source_field__form_version=old_version,
                target_field__form_version=old_version
            )

            for rule in rules:

                source_field = new_fields.get(rule.source_field.field_order)
                target_field = new_fields.get(rule.target_field.field_order)

                if source_field and target_field:

                    ConditionalRule.objects.create(
                        source_field=source_field,
                        operator=rule.operator,
                        expected_value=rule.expected_value,
                        target_field=target_field,
                        action=rule.action
                    )

        if scheduled_publish_at:
            return Response({
                "message": "Form scheduled successfully",
                "status": form.status,
                "scheduled_publish_at": form.scheduled_publish_at,
            })

        return Response({"message": "Form published successfully"})
        # ==========================================================
        # FORM DUPLICATION
        # ==========================================================
        @action(detail=True, methods=["post"])
        def duplicate(self, request, pk=None):

            original_form = self.get_object()

            # ------------------------------------------------------
            # 1. CREATE NEW FORM
            # ------------------------------------------------------

            new_form = Form.objects.create(
                owner=request.user,
                title=f"{original_form.title} Copy",
                description=original_form.description,
                status="draft",
                Fields=original_form.Fields
            )

            # ------------------------------------------------------
            # 2. GET LATEST VERSION OF ORIGINAL FORM
            # ------------------------------------------------------

            original_version = (
                FormVersion.objects
                .filter(form=original_form)
                .order_by("-version")
                .first()
            )

            # ------------------------------------------------------
            # 3. CREATE NEW VERSION
            # ------------------------------------------------------

            new_version = FormVersion.objects.create(
                form=new_form,
                version=1,
                is_published=False
            )

            # Frontend/old Field ID -> New Field object
            field_map = {}

            # ------------------------------------------------------
            # 4. COPY FIELDS
            # ------------------------------------------------------

            if original_version:

                original_fields = Field.objects.filter(
                    form_version=original_version
                ).order_by("field_order")

                for old_field in original_fields:

                    new_field = Field.objects.create(
                        form_version=new_version,

                        label=old_field.label,
                        field_type=old_field.field_type,
                        placeholder=old_field.placeholder,
                        is_required=old_field.is_required,

                        min_length=old_field.min_length,
                        max_length=old_field.max_length,

                        min_value=old_field.min_value,
                        max_value=old_field.max_value,

                        min_date=old_field.min_date,
                        max_date=old_field.max_date,

                        field_order=old_field.field_order
                    )

                    field_map[old_field.id] = new_field

                    # --------------------------------------------------
                    # COPY FIELD OPTIONS
                    # --------------------------------------------------

                    old_options = FieldOption.objects.filter(
                        field=old_field
                    ).order_by("option_order")

                    for option in old_options:

                        FieldOption.objects.create(
                            field=new_field,
                            option_text=option.option_text,
                            option_order=option.option_order
                        )

                # ------------------------------------------------------
                # 5. COPY CONDITIONAL RULES
                # ------------------------------------------------------

                old_rules = ConditionalRule.objects.filter(
                    source_field__form_version=original_version,
                    target_field__form_version=original_version
                )

                for rule in old_rules:

                    new_source_field = field_map.get(
                        rule.source_field.id
                    )

                    new_target_field = field_map.get(
                        rule.target_field.id
                    )

                    if new_source_field and new_target_field:

                        ConditionalRule.objects.create(
                            source_field=new_source_field,
                            operator=rule.operator,
                            expected_value=rule.expected_value,
                            target_field=new_target_field,
                            action=rule.action
                        )

            # ------------------------------------------------------
            # 6. RETURN NEW FORM
            # ------------------------------------------------------

            return Response(
                {
                    "message": "Form duplicated successfully",
                    "original_form_id": original_form.id,
                    "new_form_id": new_form.id,
                    "new_form": FormSerializer(new_form).data
                },
                status=status.HTTP_201_CREATED
            )

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        form = self.get_object()

        form.status = "archived"
        form.save()

        return Response({
            "message": "Form archived successfully"
        })
    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        form = self.get_object()

        form.status = "published"
        form.save()

        return Response({
            "message": "Form restored successfully"
        })
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):

        form = self.get_object()

        versions = FormVersion.objects.filter(
            form=form
        ).order_by("version")

        return Response([
            {
                "id": version.id,
                "version": version.version,
                "is_published": version.is_published
            }
            for version in versions
        ])

    @action(detail=True, methods=["get"])
    def public(self, request, pk=None):
        form = self.get_object()

        schedule_message = maybe_auto_publish_scheduled_form(form)
        if schedule_message:
            return Response({"error": schedule_message}, status=403)

        latest_version = (
            FormVersion.objects.filter(
                form=form,
                is_published=True,
            )
            .order_by("-version")
            .first()
        )
        # ...rest of function unchanged...

        if not latest_version:
            return Response(
                {"message": "No published version found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        fields = Field.objects.filter(
            form_version=latest_version
        ).order_by("field_order")

        data = {
    "form_name": latest_version.form.title,
    "description": latest_version.form.description,
    "version": latest_version.version,
    "uuid": str(latest_version.uuid),
    "fields": [],
    "rules": [],
}

        for field in fields:
            data["fields"].append(
    {
        "id": field.id,
        "label": field.label,
        "field_type": field.field_type,
        "placeholder": field.placeholder,
        "required": field.is_required,
        "min_length": field.min_length,
        "max_length": field.max_length,
        "min_value": field.min_value,
        "max_value": field.max_value,

        "options": [
            option.option_text
            for option in FieldOption.objects.filter(field=field)
        ],
    }
)   
            return Response(data)


    # ==========================================================
    # RESPONSE ANALYTICS
    # ==========================================================
    @action(detail=True, methods=["get"])
    def analytics(self, request, pk=None):

        form = self.get_object()

        # ==========================================================
        # 1. SELECT FORM VERSIONS
        # ==========================================================

        version_id = request.query_params.get("version")

        if version_id:
            form_versions = FormVersion.objects.filter(
                form=form,
                id=version_id
            )
        else:
            form_versions = FormVersion.objects.filter(
                form=form
            )

        # ==========================================================
        # 2. GET SUBMISSIONS
        # ==========================================================

        submissions = Submission.objects.filter(
            form_version__in=form_versions
        )

        # ==========================================================
        # 3. DATE FILTER
        # ==========================================================

        selected_date = request.query_params.get("date")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if selected_date:
            submissions = submissions.filter(
                started_at__date=selected_date
            )

        elif start_date and end_date:
            submissions = submissions.filter(
                started_at__date__range=[
                    start_date,
                    end_date
                ]
            )

        # ==========================================================
        # 4. TOTAL SUBMISSIONS
        # ==========================================================

        total_submissions = submissions.filter(
            status="submitted"
        ).count()

        # ==========================================================
        # 5. TOTAL STARTED
        # ==========================================================

        total_started = submissions.count()

        if total_started > 0:
            completion_rate = (
                total_submissions / total_started
            ) * 100
        else:
            completion_rate = 0

        # ==========================================================
        # 6. AVERAGE TIME TO COMPLETE
        # ==========================================================

        completed_submissions = submissions.filter(
            status="submitted",
            completion_time_seconds__isnull=False
        )

        average_time = completed_submissions.aggregate(
            average=Avg("completion_time_seconds")
        )["average"]

        if average_time is None:
            average_time = 0

        # ==========================================================
        # 7. PER-FIELD DISTRIBUTION
        # ==========================================================

        field_distribution = {}

        response_values = ResponseValue.objects.filter(
            submission__in=submissions.filter(
                status="submitted"
            )
        ).select_related("field")

        for response in response_values:

            field = response.field

            if field.field_type in [
                "dropdown",
                "rating"
            ]:

                field_name = field.label
                answer = response.value

                if field_name not in field_distribution:
                    field_distribution[field_name] = {}

                if answer not in field_distribution[field_name]:
                    field_distribution[field_name][answer] = 0

                field_distribution[field_name][answer] += 1

        # ==========================================================
        # 8. RETURN ANALYTICS
        # ==========================================================

        return Response({

            "form_id": form.id,

            "form_name": form.title,

            "selected_date": selected_date,

            "start_date": start_date,

            "end_date": end_date,

            "total_started": total_started,

            "total_submissions": total_submissions,

            "completion_rate": round(
                completion_rate,
                2
            ),

            "average_time_to_complete": round(
                average_time,
                2
            ),

            "field_distribution": field_distribution
        })
    @action(
        detail=True,
        methods=["get"],
        url_path="analytics/trend"
    )
    def analytics_trend(self, request, pk=None):

        form = self.get_object()

        submissions = Submission.objects.filter(
            form_version__form=form,
            status="submitted"
        )

        trend = (
            submissions
            .annotate(date=TruncDate("submitted_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        data = []

        for item in trend:
            data.append({
                "date": item["date"],
                "count": item["count"]
            })

        return Response({
            "form_id": form.id,
            "trend": data
        })

class FieldViewSet(viewsets.ModelViewSet):
    queryset = Field.objects.all()
    serializer_class = FieldSerializer

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        fields = request.data.get("fields", [])

        for item in fields:
            try:
                field = Field.objects.get(id=item["id"])
                field.field_order = item["field_order"]
                field.save()
            except Field.DoesNotExist:
                pass

        return Response(
            {"message": "Field order updated successfully"},
            status=status.HTTP_200_OK
        )
def normalize_email(value):
    """
    Trim whitespace and lowercase an email value
    so duplicate checks are case/whitespace-insensitive.
    """
    return str(value or "").strip().lower()
def maybe_auto_publish_scheduled_form(form):
    """
    Reusable publication gate for scheduled forms.
    """
    if not form:
        return None

    auto_publish_due_scheduled_forms()

    try:
        form.refresh_from_db()
    except Exception:
        pass

    if form.status == "published":
        return None

    if form.status != "scheduled":
        return None

    if form.scheduled_publish_at and timezone.now() >= form.scheduled_publish_at:
        form.status = "published"
        form.save(update_fields=["status"])
        return None

    when = form.scheduled_publish_at
    display = (
        timezone.localtime(when).strftime("%d %b %Y, %I:%M %p")
        if when else "a later date"
    )
    return f"This form is scheduled to be published on {display}."

# ==========================================================
# AI-ASSISTED FORM GENERATION
# ==========================================================

ALLOWED_AI_FIELD_TYPES = {
    "text", "number", "email", "dropdown",
    "checkbox", "multicheckbox", "date", "file", "rating",
}

AI_OPTION_FIELD_TYPES = {"dropdown", "multicheckbox"}

AI_PROMPT_MIN_LENGTH = 5
AI_PROMPT_MAX_LENGTH = 600


def _extract_json_block(text):
    """
    LLMs sometimes wrap JSON in ```json ... ``` fences even when told
    not to. Strip those defensively before parsing.
    """
    text = (text or "").strip()

    fence_match = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()

    return text


def _validate_generated_form(data):
    """
    Validates and sanitizes the LLM's JSON output before it is ever
    returned to the frontend. Never trusts the AI: unsupported field
    types are rejected, malformed fields are skipped (not fatal), and
    nothing here executes AI-provided code - it's pure data cleanup.

    Returns (cleaned_data, error_message). error_message is None on success.
    """
    if not isinstance(data, dict):
        return None, "AI response was not a valid form structure."

    title = str(data.get("title", "")).strip()[:255]
    description = str(data.get("description", "")).strip()[:2000]
    raw_fields = data.get("fields", [])

    if not title:
        return None, "AI response did not include a form title."

    if not isinstance(raw_fields, list) or not raw_fields:
        return None, "AI response did not include any fields."

    cleaned_fields = []

    for item in raw_fields:

        if not isinstance(item, dict):
            continue

        label = str(item.get("label", "")).strip()[:255]
        field_type = str(item.get("type", "")).strip().lower()

        if not label or field_type not in ALLOWED_AI_FIELD_TYPES:
            # Skip invalid/unsupported fields rather than failing
            # the whole generation.
            continue

        cleaned_field = {
            "label": label,
            "type": field_type,
            "required": bool(item.get("required", False)),
            "placeholder": str(item.get("placeholder", ""))[:255],
        }

        if field_type in AI_OPTION_FIELD_TYPES:

            raw_options = item.get("options", [])

            options = [
                str(option).strip()[:255]
                for option in raw_options
                if isinstance(option, (str, int, float)) and str(option).strip()
            ][:20]

            if not options:
                options = ["Option 1", "Option 2"]

            cleaned_field["options"] = options

        cleaned_fields.append(cleaned_field)

    if not cleaned_fields:
        return None, "AI response did not contain any valid, supported fields."

    return {
        "title": title,
        "description": description,
        "fields": cleaned_fields,
    }, None


def _call_llm_chat(system_prompt, user_prompt, temperature=0.7):
    """
    Unified LLM chat caller supporting Groq API (llama-3.3-70b-versatile) with fallback to Anthropic API.
    """
    groq_key = os.environ.get("GROQ_API_KEY")
    llm_key = os.environ.get("LLM_API_KEY")
    api_key = groq_key or llm_key

    if not api_key:
        raise RuntimeError("LLM_API_KEY or GROQ_API_KEY is not configured on the server.")

    is_anthropic = api_key.startswith("sk-ant-")

    if not is_anthropic:
        models_to_try = [
            os.environ.get("GROQ_MODEL", "groq/compound-mini"),
            "groq/compound-mini",
            "qwen/qwen3.6-27b",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b"
        ]

        last_error = None
        for model_name in models_to_try:
            try:
                response = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": temperature,
                        "response_format": {"type": "json_object"}
                    },
                    timeout=30,
                )
                if response.status_code == 200:
                    payload = response.json()
                    return payload["choices"][0]["message"]["content"]
                else:
                    detail = response.text
                    try:
                        detail = response.json().get("error", {}).get("message", response.text)
                    except Exception:
                        pass
                    last_error = f"Groq API error ({model_name}): {detail}"
                    logger.warning(last_error)
            except Exception as e:
                last_error = f"Groq request exception ({model_name}): {e}"
                logger.warning(last_error)

        raise RuntimeError(last_error or "Groq API request failed.")

    else:
        request_data = {
            "model": "claude-sonnet-5",
            "max_tokens": 1500,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}]
        }
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=request_data,
            timeout=30,
        )
        if response.status_code >= 400:
            try:
                detail = response.json().get("error", {}).get("message", response.text)
            except ValueError:
                detail = response.text
            raise RuntimeError(f"Anthropic API error: {detail}")

        payload = response.json()
        text_parts = [
            block.get("text", "")
            for block in payload.get("content", [])
            if block.get("type") == "text"
        ]
        return "".join(text_parts)


def _call_form_generation_llm(prompt):
    """
    Calls LLM API (Groq or Anthropic) and returns generated form structure JSON string.
    """
    system_prompt = (
        "You generate JSON form definitions for a form builder. "
        "Respond with ONLY raw JSON, no markdown fences, no commentary. "
        "The JSON must have this exact structure: "
        '{"title": "string", '
        '"description": "string", '
        '"fields": ['
        '{"label": "string", '
        '"type": "text|number|email|dropdown|checkbox|multicheckbox|date|file|rating", '
        '"required": true, '
        '"placeholder": "string", '
        '"options": ["string"]}'
        "]}"
        "Use 3 to 8 fields that make sense for the request. "
        "Only use options for dropdown or multicheckbox fields."
    )
    return _call_llm_chat(system_prompt, prompt, temperature=0.7)


class AIGenerateFormView(APIView):
    """
    POST /api/ai/generate-form/
    """
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        prompt = str(request.data.get("prompt", "")).strip()

        if len(prompt) < AI_PROMPT_MIN_LENGTH:
            return Response(
                {"error": "Please describe the form in a bit more detail."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(prompt) > AI_PROMPT_MAX_LENGTH:
            return Response(
                {"error": f"Description must be under {AI_PROMPT_MAX_LENGTH} characters."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            raw_text = _call_form_generation_llm(prompt)
        except RuntimeError as e:
            logger.error(f"AI FORM GENERATION CONFIG ERROR: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"AI FORM GENERATION REQUEST FAILED: {e}", exc_info=True)
            return Response(
                {"error": f"AI generation failed: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        try:
            json_text = _extract_json_block(raw_text)
            parsed = json.loads(json_text)
        except (json.JSONDecodeError, TypeError):
            logger.error(f"AI FORM GENERATION: invalid JSON returned: {raw_text[:500]}")
            return Response(
                {"error": "Unable to generate the form. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY
            )

        cleaned, error = _validate_generated_form(parsed)
        if error:
            return Response(
                {"error": error},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        return Response(cleaned, status=status.HTTP_200_OK)


class AIFillFormView(APIView):
    """
    POST /api/ai/autofill-form/
    Generates realistic sample responses for form fields using Groq LLM.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        fields = request.data.get("fields", [])
        prompt_context = request.data.get("prompt", "")

        if not fields or not isinstance(fields, list):
            return Response(
                {"error": "A list of fields is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        simplified_fields = []
        for f in fields:
            simplified_fields.append({
                "id": str(f.get("id")),
                "label": f.get("label", ""),
                "field_type": f.get("type", f.get("field_type", "text")),
                "options": f.get("options", []),
                "placeholder": f.get("placeholder", "")
            })

        system_prompt = (
            "You are an intelligent form respondent assistant. "
            "You fill out form fields with realistic, high-quality test values. "
            "Respond ONLY with valid JSON mapping each field 'id' (as string key) to a suitable string answer. "
            "For 'dropdown' or 'multicheckbox' or 'checkbox', pick valid options from the provided options list. "
            "For 'rating', return a number string between 1 and 5. "
            "For 'date', return YYYY-MM-DD. "
            "For 'email', return a valid format email. "
            "For 'number', return a realistic number."
        )

        user_prompt = f"Context: {prompt_context}\nForm Fields:\n{json.dumps(simplified_fields)}"

        try:
            raw_text = _call_llm_chat(system_prompt, user_prompt, temperature=0.7)
            json_text = _extract_json_block(raw_text)
            parsed = json.loads(json_text)
            return Response({"values": parsed}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"AI AUTOFILL ERROR: {e}", exc_info=True)
            return Response({"error": f"Auto-fill failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AITranslateFormView(APIView):
    """
    POST /api/ai/translate-form/
    Translates form title, description, labels, placeholders, and options into a target language using Groq LLM.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        target_lang = str(request.data.get("target_language", "English")).strip()
        title = request.data.get("title", "")
        description = request.data.get("description", "")
        fields = request.data.get("fields", [])

        if not target_lang or target_lang.lower() == "english":
            return Response({
                "target_language": "English",
                "title": title,
                "description": description,
                "fields": fields
            }, status=status.HTTP_200_OK)

        simplified_fields = []
        for f in fields:
            simplified_fields.append({
                "id": f.get("id"),
                "label": f.get("label", ""),
                "placeholder": f.get("placeholder", ""),
                "options": f.get("options", [])
            })

        system_prompt = (
            f"You are a professional translator. Translate form content accurately into {target_lang}. "
            "Respond ONLY with valid JSON adhering strictly to this JSON structure: "
            '{"title": "translated string", "description": "translated string", "fields": [{"id": ..., "label": "translated label", "placeholder": "translated placeholder", "options": ["translated option 1", ...]}]}'
        )

        user_prompt = json.dumps({
            "title": title,
            "description": description,
            "fields": simplified_fields
        })

        try:
            raw_text = _call_llm_chat(system_prompt, user_prompt, temperature=0.3)
            json_text = _extract_json_block(raw_text)
            parsed = json.loads(json_text)

            translated_field_map = {str(item.get("id")): item for item in parsed.get("fields", [])}
            new_fields = []
            for original_field in fields:
                fid_str = str(original_field.get("id"))
                if fid_str in translated_field_map:
                    tf = translated_field_map[fid_str]
                    copied = dict(original_field)
                    if tf.get("label"): copied["label"] = tf["label"]
                    if tf.get("placeholder"): copied["placeholder"] = tf["placeholder"]
                    if tf.get("options"): copied["options"] = tf["options"]
                    new_fields.append(copied)
                else:
                    new_fields.append(original_field)

            return Response({
                "target_language": target_lang,
                "title": parsed.get("title") or title,
                "description": parsed.get("description") or description,
                "fields": new_fields
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"AI TRANSLATION ERROR: {e}", exc_info=True)
            return Response({"error": f"Translation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def send_submission_confirmation_email(submission):
    """
    Send a confirmation email to the submission's verified
    respondent_email (captured via Google sign-in + OTP during
    the identity step), regardless of whether the form itself
    has an Email field.
    """

    try:
        form = submission.form_version.form

        recipient = normalize_email(submission.respondent_email)

        if not recipient:
            logger.error(
                f"CONFIRMATION EMAIL SKIPPED for submission {submission.id}: "
                f"no verified respondent_email set on this submission."
            )
            return False

        submitted_at = submission.submitted_at or timezone.now()

        subject = f"Form Submission Confirmation - {form.title}"

        message = (
            "Hello,\n\n"
            f"Your response to \"{form.title}\" has been submitted successfully.\n\n"
            f"Response ID: RESP-{submission.id}\n"
            f"Submitted at: {submitted_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            "Your response has been recorded successfully.\n\n"
            "Thank you,\n"
            "FormFlow"
        )

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )

        return True

    except Exception as e:
        logger.error(
            f"CONFIRMATION EMAIL FAILED for submission {submission.id}: {e}",
            exc_info=True,
        )
        return False


def evaluate_condition(rule, submitted_data):
    """
    Evaluate one conditional rule against submitted responses.
    """

    source_value = submitted_data.get(rule.source_field_id, "")

    if source_value is None:
        source_value = ""

    source_value = str(source_value).strip()
    expected_value = str(rule.expected_value).strip()

    if rule.operator == "equals":
        return source_value == expected_value

    elif rule.operator == "not_equals":
        return source_value != expected_value

    elif rule.operator == "contains":
        return expected_value.lower() in source_value.lower()

    elif rule.operator == "is_empty":
        return source_value == ""

    elif rule.operator == "greater_than":
        try:
            return float(source_value) > float(expected_value)
        except (ValueError, TypeError):
            return False

    return False


class SubmissionViewSet(viewsets.ModelViewSet):

    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer

    @action(detail=False, methods=["get"])
    def count(self, request):
        return Response({
            "count": Submission.objects.filter(
                form_version__form__owner=request.user
            ).exclude(
                status="deleted"
            ).count()
        })
    @action(detail=False, methods=["get"])
    def analytics(self, request):
            if not request.user.is_authenticated:
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # All submissions belonging to logged-in user's forms
            submissions = Submission.objects.filter(
                form_version__form__owner=request.user
            )

            # ----------------------------------------------------------
            # 1. TOTAL SUBMISSIONS
            # ----------------------------------------------------------

            total_submissions = submissions.filter(
                status="submitted"
            ).count()

            # ----------------------------------------------------------
            # 2. COMPLETION RATE
            # ----------------------------------------------------------

            total_started = submissions.count()

            if total_started > 0:
                completion_rate = (
                    total_submissions / total_started
                ) * 100
            else:
                completion_rate = 0

            # ----------------------------------------------------------
            # 3. AVERAGE TIME TO COMPLETE
            # ----------------------------------------------------------

            completed_submissions = submissions.filter(
                status="submitted",
                completion_time_seconds__isnull=False
            )

            average_time = completed_submissions.aggregate(
                average=Avg("completion_time_seconds")
            )["average"]

            if average_time is None:
                average_time = 0

            # ----------------------------------------------------------
            # 4. PER-FIELD DISTRIBUTION
            # ----------------------------------------------------------

            field_distribution = {}

            response_values = ResponseValue.objects.filter(
                submission__in=submissions.filter(
                    status="submitted"
                )
            ).select_related("field")

            for response in response_values:

                field_name = response.field.label

                if response.field.field_type in [
                    "dropdown",
                    "rating"
                ]:

                    if field_name not in field_distribution:
                        field_distribution[field_name] = {}

                    answer = response.value

                    if answer not in field_distribution[field_name]:
                        field_distribution[field_name][answer] = 0

                    field_distribution[field_name][answer] += 1

            # ----------------------------------------------------------
            # RETURN ANALYTICS
            # ----------------------------------------------------------

            return Response({
                "total_submissions": total_submissions,
                "completion_rate": round(completion_rate, 2),
                "average_time_to_complete": round(
                    average_time, 2
                ),
                "field_distribution": field_distribution
            })
    @action(detail=False, methods=["post"])
    def bulk_delete_responses(self, request):

        submission_ids = request.data.get("submission_ids", [])

        if not submission_ids:
            return Response(
                {"detail": "No submissions selected."},
                status=400
            )

        submissions = Submission.objects.filter(
            id__in=submission_ids,
            form_version__form__owner=request.user
        )

        affected_ids = list(
            submissions.values_list("id", flat=True)
        )

        if not affected_ids:
            return Response(
                {"detail": "No valid submissions found."},
                status=404
            )

        # Soft delete
        submissions.update(
            status="deleted"
        )

        # Audit log
        AuditLog.objects.create(
            user=request.user,
            action="BULK_DELETE",
            affected_submissions=affected_ids
        )

        return Response({
            "message": "Responses deleted successfully.",
            "affected_submissions": affected_ids
        })
    @action(detail=False, methods=["get"])
    def responses(self, request):

        # ==========================================================
        # 1. GET ONLY LOGGED-IN USER'S RESPONSES
        # ==========================================================

        submissions = Submission.objects.filter(
            form_version__form__owner=request.user
        ).exclude(
            status="deleted"
        ).order_by("-submitted_at")


        # ==========================================================
        # 2. DATE RANGE FILTER
        # ==========================================================

        submitted_from = request.query_params.get("submitted_from")
        submitted_to = request.query_params.get("submitted_to")

        if submitted_from:
            submissions = submissions.filter(
                submitted_at__date__gte=submitted_from
            )

        if submitted_to:
            submissions = submissions.filter(
                submitted_at__date__lte=submitted_to
            )


        # ==========================================================
        # 3. COMPLETION STATUS FILTER
        # ==========================================================

        completion_status = request.query_params.get("status")

        if completion_status:

            completion_status = completion_status.lower()

            if completion_status == "completed":
                submissions = submissions.filter(
                    status="submitted"
                )

            elif completion_status == "in_progress":
                submissions = submissions.filter(
                    status="in_progress"
                )


        # ==========================================================
        # 4. SPECIFIC FIELD VALUE FILTER
        # Example:
        # ?field=Department&value=IT
        # ==========================================================

        field_name = request.query_params.get("field")
        field_value = request.query_params.get("value")

        if field_name and field_value:

            submissions = submissions.filter(
                responsevalue__field__label__iexact=field_name,
                responsevalue__value__iexact=field_value
            ).distinct()


        # ==========================================================
        # 5. OPTIONAL TEXT SEARCH
        # Searches submission ID and response values
        # Example:
        # ?search=105
        # ?search=Janasree
        # ==========================================================

        search = request.query_params.get("search")

        if search:

            search_query = Q()

            # Search by response ID
            response_id = search.replace("RESP-", "").strip()

            if response_id.isdigit():
                search_query |= Q(id=int(response_id))

            # Search inside submitted response values
            search_query |= Q(
                responsevalue__value__icontains=search
            )

            submissions = submissions.filter(
                search_query
            ).distinct()


        # ==========================================================
        # 6. PAGINATION
        # Example:
        # ?page=1&page_size=20
        # ==========================================================

        try:
            page = int(
                request.query_params.get("page", 1)
            )
        except ValueError:
            page = 1

        try:
            page_size = int(
                request.query_params.get("page_size", 20)
            )
        except ValueError:
            page_size = 20

        # Prevent very large requests
        page_size = min(page_size, 100)

        if page < 1:
            page = 1


        total_count = submissions.count()

        start = (page - 1) * page_size
        end = start + page_size

        paginated_submissions = submissions[
            start:end
        ]


        # ==========================================================
        # 7. BUILD RESPONSE DATA
        # ==========================================================

        data = []

        for submission in paginated_submissions:

            response_values = ResponseValue.objects.filter(
                submission=submission
            ).select_related("field")

            responses = []

            for response in response_values:

                file_url = None

                if response.field.field_type in [
                    "file",
                    "file upload"
                ]:

                    uploaded_file = UploadedFile.objects.filter(
                        submission=submission,
                        field=response.field
                    ).first()

                    if uploaded_file:

                        token = signing.dumps({
                            "file_id": uploaded_file.id,
                            "owner_id": request.user.id
                        })

                        file_url = request.build_absolute_uri(
                            f"/api/submissions/file/{token}/"
                        )

                responses.append({
                    "field": response.field.label,
                    "value": response.value,
                    "file_url": file_url,
                })

            data.append({
                "submission_id": submission.id,
                "response_id": f"RESP-{submission.id}",
                "form_version": submission.form_version.version,
                "submitted_at": submission.submitted_at,
                "status": submission.status,
                "responses": responses,
            })


        # ==========================================================
        # 8. PAGINATION RESPONSE
        # ==========================================================

        total_pages = (
            (total_count + page_size - 1)
            // page_size
        )

        return Response({

            "count": total_count,

            "page": page,

            "page_size": page_size,

            "total_pages": total_pages,

            "results": data

        })

    @action(detail=False, methods=["get"])
    def export(self, request):

        # Selected form version
        version_id = request.query_params.get("form_version")
        export_format = request.query_params.get("export", "csv").lower()

        if not version_id:
            return Response(
                {"error": "form_version is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check form version belongs to logged-in user
        try:
            form_version = FormVersion.objects.get(
                id=version_id,
                form__owner=request.user
            )
        except FormVersion.DoesNotExist:
            return Response(
                {"error": "Form version not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get fields in correct order
        fields = Field.objects.filter(
            form_version=form_version
        ).order_by("field_order")

        # Get submitted responses
        submissions = Submission.objects.filter(
            form_version=form_version,
            status="submitted"
        ).order_by("id")

        # ==========================================================
        # BUILD RESPONSE DATA
        # ==========================================================

        export_data = []

        for submission in submissions:

            response_values = ResponseValue.objects.filter(
                submission=submission
            ).select_related("field")

            response_map = {}

            for response_value in response_values:

                field = response_value.field
                value = response_value.value

                # ======================================================
                # FILE FIELD
                # ======================================================

                if field.field_type in ["file", "file upload"]:

                    uploaded_file = UploadedFile.objects.filter(
                        submission=submission,
                        field=field
                    ).first()

                    if uploaded_file:

                        token = signing.dumps({
                            "file_id": uploaded_file.id,
                            "owner_id": request.user.id,
                        })

                        value = request.build_absolute_uri(
                            f"/api/submissions/file/{token}/"
                        )

                response_map[field.label] = value

            export_data.append(response_map)

        # ==========================================================
        # JSON EXPORT
        # ==========================================================

        if export_format == "json":

            response = HttpResponse(
                json.dumps(export_data, indent=2),
                content_type="application/json"
            )

            response["Content-Disposition"] = (
                'attachment; filename="responses.json"'
            )

            return response

        # ==========================================================
        # CSV EXPORT
        # ==========================================================

        if export_format == "csv":

            response = HttpResponse(
                content_type="text/csv"
            )

            response["Content-Disposition"] = (
                'attachment; filename="responses.csv"'
            )

            writer = csv.writer(response)

            # Header row
            writer.writerow([
                field.label
                for field in fields
            ])

            # Data rows
            # Data rows
            for submission_data in export_data:

                row = []

                for field in fields:

                    value = submission_data.get(field.label, "")

                    # Keep phone/mobile/contact numbers as text in Excel
                    if (
                        "phone" in field.label.lower()
                        or "mobile" in field.label.lower()
                        or "contact" in field.label.lower()
                    ):
                        if value:
                            value = f'="{value}"'

                    # Keep date values as text in Excel
                    elif field.field_type == "date" and value:
                        value = f'="{value}"'

                    row.append(value)

                writer.writerow(row)

            return response

        # ==========================================================
        # INVALID FORMAT
        # ==========================================================

        return Response(
            {
                "error": "Invalid format. Use csv or json."
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    @action(
    detail=False,
    methods=["get"],
    url_path=r"file/(?P<token>[^/]+)"
)
    def download_file(self, request, token=None):

        try:

            data = signing.loads(
                token,
                max_age=3600
            )

            file_id = data.get("file_id")
            owner_id = data.get("owner_id")

        except signing.BadSignature:

            return Response(
                {"error": "Invalid or expired file URL"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:

            uploaded_file = UploadedFile.objects.select_related(
                "submission__form_version__form"
            ).get(
                id=file_id
            )

        except UploadedFile.DoesNotExist:

            return Response(
                {"error": "File not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check that the signed URL belongs to the form owner
        if uploaded_file.submission.form_version.form.owner_id != owner_id:

            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        response = HttpResponse(
            uploaded_file.file.open("rb").read(),
            content_type="application/octet-stream"
        )

        response["Content-Disposition"] = (
            f'attachment; filename="{uploaded_file.file.name.split("/")[-1]}"'
        )

        return response
    
    @action(
    detail=False,
    methods=["post"],
    url_path=r"(?P<uuid>[^/.]+)/submit"
)
    def submit(self, request, uuid=None):

    # 1. Find published form version using UUID
        try:
            form_version = FormVersion.objects.get(
                uuid=uuid,
                is_published=True
            )
        except FormVersion.DoesNotExist:
            return Response(
                {"error": "Published form version not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. Get submitted responses
        responses = request.data.get("responses", [])
        files = request.FILES

        # Convert JSON string to Python list
        if isinstance(responses, str):
            responses = json.loads(responses)

        # Convert submitted responses into dictionary
        submitted_data = {
            item.get("field_id"): item.get("value")
            for item in responses
        }

        # 3. Load fields belonging to this form version
        fields = Field.objects.filter(
            form_version=form_version
        )

        # ==========================================================
        # 4. CONDITIONAL LOGIC EVALUATOR
        # ==========================================================

        rules = ConditionalRule.objects.filter(
            source_field__form_version=form_version,
            target_field__form_version=form_version
        )
        hidden_fields = set()
        required_fields = set()

        # Track SHOW rules
        show_rules = {}

        for rule in rules:

            condition_met = evaluate_condition(
                rule,
                submitted_data
            )

            # SHOW rule
            if rule.action == "show":

                if rule.target_field_id not in show_rules:
                    show_rules[rule.target_field_id] = {
                        "has_rule": True,
                        "condition_met": False,
                    }

                if condition_met:
                    show_rules[rule.target_field_id]["condition_met"] = True

            # HIDE rule
            elif rule.action == "hide":

                if condition_met:
                    hidden_fields.add(rule.target_field_id)

            # REQUIRE rule
            elif rule.action == "require":

                if condition_met:
                    required_fields.add(rule.target_field_id)
            # If a SHOW rule exists and its condition is NOT met,
            # hide that target field.
            for field_id, rule_data in show_rules.items():

                if not rule_data["condition_met"]:
                    hidden_fields.add(field_id)

        # ==========================================================
        # 5. SERVER-SIDE VALIDATION
        # ==========================================================

        for field in fields:

            value = submitted_data.get(
                field.id,
                ""
            )
            # ------------------------------------------------------
            # Hidden field validation
            # ------------------------------------------------------

            if field.id in hidden_fields:

                # Hidden fields should not be submitted
                if value not in ["", None]:
                    return Response(
                        {
                            "error": (
                                f"{field.label} must not be submitted"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Ignore hidden file fields too
                if field.field_type in ["file", "file upload"]:
                    if files.get(str(field.id)):
                        return Response(
                            {
                                "error": (
                                    f"{field.label} must not be submitted"
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )

                continue
            # ------------------------------------------------------
            # File Upload Validation
            # ------------------------------------------------------

            if field.field_type in ["file","file upload"]:

                
                uploaded_file = files.get(str(field.id))

                if field.is_required and not uploaded_file:
                    return Response(
                        {
                            "error": f"{field.label} is required"
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if not uploaded_file:
                    continue

                # Maximum file size = 5 MB
                max_size = 5 * 1024 * 1024

                if uploaded_file.size > max_size:
                    return Response(
                        {
                            "error": "File size must not exceed 5 MB."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Allowed file types
                allowed_types = [
                    "image/jpeg",
                    "image/png",
                    "application/pdf"
                ]

                if uploaded_file.content_type not in allowed_types:
                    return Response(
                        {
                            "error": "Invalid file type. Please upload PDF, JPG or PNG."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if value is None:
                value = ""

            value = str(value).strip()

            # ------------------------------------------------------
            # Required validation
            # ------------------------------------------------------

            is_required = (
                field.is_required
                or field.id in required_fields
            )

            if is_required and value == "":
                return Response(
                    {
                        "error": f"{field.label} is required"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Optional empty field
            if value == "":
                continue
            # ------------------------------------------------------
            # Date validation
            # ------------------------------------------------------

            if field.field_type == "date":

                try:
                    date_value = datetime.strptime(
                        value, "%Y-%m-%d"
                    ).date()

                except ValueError:
                    return Response(
                        {
                            "error": "Invalid date. Please recheck."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Minimum Date validation
                if (
                    field.min_date is not None
                    and date_value < field.min_date
                ):
                    return Response(
                        {
                            "error": (
                                f"{field.label} must be on or after "
                                f"{field.min_date}"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Maximum Date validation
                if (
                    field.max_date is not None
                    and date_value > field.max_date
                ):
                    return Response(
                        {
                            "error": (
                                f"{field.label} must be on or before "
                                f"{field.max_date}"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            # ------------------------------------------------------
            # String length validation
            # ------------------------------------------------------

            if field.field_type in ["text", "email"]:

                if (
                    field.min_length is not None
                    and len(value) < field.min_length
                ):
                    return Response(
                        {
                            "error": (
                                f"{field.label} must contain at least "
                                f"{field.min_length} characters"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if (
                    field.max_length is not None
                    and len(value) > field.max_length
                ):
                    return Response(
                        {
                            "error": (
                                f"{field.label} must contain at most "
                                f"{field.max_length} characters"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # ------------------------------------------------------
            # Email validation
            # ------------------------------------------------------

            if field.field_type == "email":

                try:
                    validate_email(value)

                except ValidationError:
                    return Response(
                        {
                            "error": (
                                f"Invalid email for {field.label}"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # ------------------------------------------------------
            # Number validation
            # ------------------------------------------------------

            if field.field_type == "number":

                try:
                    number_value = float(value)

                except ValueError:
                    return Response(
                        {
                            "error": (
                                f"{field.label} must be a number"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if (
                    field.min_value is not None
                    and number_value < field.min_value
                ):
                    return Response(
                        {
                            "error": (
                                "Invalid Phone Number, Please Recheck"
                                if field.label == "Phone Number"
                                else f"Invalid value for {field.label}. Please Recheck"

                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if (
                    field.max_value is not None
                    and number_value > field.max_value
                ):
                    return Response(
                        {
                            "error": (
                                "Invalid Phone Number, Please Recheck"
                                if field.label == "Phone Number"
                                else f"Invalid value for {field.label}. Please Recheck"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # ------------------------------------------------------
            # Dropdown validation
            # ------------------------------------------------------

            if field.field_type == "dropdown":

                valid_options = FieldOption.objects.filter(
                    field=field
                ).values_list(
                    "option_text",
                    flat=True
                )

                if value not in valid_options:
                    return Response(
                        {
                            "error": (
                                f"Invalid option for {field.label}"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # ==========================================================
        # 6. CREATE SUBMISSION
        # ==========================================================
        submission_id = request.data.get("submission_id")
        if not submission_id:
            return Response(
                {"error": "Submission ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission = get_object_or_404(
            Submission,
            id=submission_id,
            form_version=form_version
        )

        if submission.status == "submitted":
            return Response(
                {"error": "This form has already been submitted"},
                status=status.HTTP_400_BAD_REQUEST
            )

                # ==========================================================
        # 6B. LIMIT ONE RESPONSE PER EMAIL
        # Now uses the verified respondent_email, not a form field.
        # ==========================================================

        if form_version.form.limit_one_response_per_email:

            submitted_email = normalize_email(submission.respondent_email)

            if submitted_email:

                duplicate_exists = Submission.objects.filter(
                    form_version__form=form_version.form,
                    status="submitted",
                    respondent_email=submitted_email,
                ).exclude(
                    id=submission.id
                ).exists()

                if duplicate_exists:
                    return Response(
                        {
                            "error": "This email has already submitted this form."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # ==========================================================
        # 7. SAVE RESPONSE VALUES
        # ==========================================================
        for item in responses:

            field_id = item.get("field_id")
            value = item.get("value", "")

            try:
                field = Field.objects.get(
                    id=field_id,
                    form_version=form_version
                )

            except Field.DoesNotExist:
                continue

            # Don't save hidden fields
            if field.id in hidden_fields:
                continue

            if field.field_type in ["file", "file upload"]:
                uploaded_file = files.get(str(field.id))

                if uploaded_file:
                    UploadedFile.objects.create(
                        submission=submission,
                        field=field,
                        file=uploaded_file
                    )

                    ResponseValue.objects.create(
                        submission=submission,
                        field=field,
                        value=uploaded_file.name
                    )

                continue

            ResponseValue.objects.create(
                submission=submission,
                field=field,
                value=str(value)
            )
        # ==========================================================
        # 8. COMPLETE SUBMISSION
        # ==========================================================

        submission.submitted_at = timezone.now()
        submission.status = "submitted"

        if submission.started_at:
            submission.completion_time_seconds = (
                submission.submitted_at - submission.started_at
            ).total_seconds()

        submission.save()
        # Mark one-time link as used
        one_time_link = OneTimeLink.objects.filter(
            submission=submission
        ).first()

        if one_time_link:
            one_time_link.used = True
            one_time_link.used_at = timezone.now()
            one_time_link.save()



                # ==========================================================
        # 8. SEND CONFIRMATION EMAIL
        # (submission is already saved above - failure here
        # must NOT affect the successful submission response)
        # ==========================================================

        email_sent = send_submission_confirmation_email(submission)

        # ==========================================================
        # 9. RETURN RESPONSE ID
        # ==========================================================

        return Response(
            {
                "response_id": f"RESP-{submission.id}",
                "submission_id": submission.id,
                "message": "Submitted Successfully",
                "email_sent": email_sent,
            },
            status=status.HTTP_201_CREATED
        )
class ConditionalRuleViewSet(viewsets.ModelViewSet):
    queryset = ConditionalRule.objects.all()
    serializer_class = ConditionalRuleSerializer

@api_view(["GET"])
def public_form_by_uuid(request, uuid):

    version = get_object_or_404(
        FormVersion,
        uuid=uuid
    )

    schedule_message = maybe_auto_publish_scheduled_form(version.form)
    if schedule_message:
        return Response({"error": schedule_message}, status=403)

    if (
        version.expires_at is not None
        and timezone.now() >= version.expires_at
    ):
        return Response({"error": "This form has expired."}, status=410)

    # ...rest of function unchanged...

    fields = Field.objects.filter(
        form_version=version
    ).order_by("field_order")

    data = {
        "form_name": version.form.title,
        "description": version.form.description,
        "version": version.version,
        "uuid": str(version.uuid),
        "fields": [],
        "rules": [],
    }

    json_fields = version.form.Fields or []

    for field in fields:
        options = list(
            FieldOption.objects.filter(field=field)
            .order_by("option_order")
            .values_list("option_text", flat=True)
        )
        if not options:
            matching_json = next(
                (jf for jf in json_fields if str(jf.get("label", "")).strip().lower() == str(field.label).strip().lower()),
                None
            )
            if matching_json and matching_json.get("options"):
                options = matching_json.get("options")

        data["fields"].append({
            "id": field.id,
            "label": field.label,
            "field_type": field.field_type,
            "placeholder": field.placeholder,
            "required": field.is_required,
            "min_length": field.min_length,
            "max_length": field.max_length,
            "min_value": field.min_value,
            "max_value": field.max_value,
            "options": options,
        })


    rules = ConditionalRule.objects.filter(
        source_field__form_version=version,
        target_field__form_version=version
    )

    for rule in rules:
        data["rules"].append({
            "source_field": rule.source_field.id,
            "operator": rule.operator,
            "expected_value": rule.expected_value,
            "target_field": rule.target_field.id,
            "action": rule.action,
        })

    return Response(data)
@api_view(["POST"])
def start_public_form(request, uuid):

    version = get_object_or_404(
        FormVersion,
        uuid=uuid,
        is_published=True
    )

    schedule_message = maybe_auto_publish_scheduled_form(version.form)
    if schedule_message:
        return Response({"error": schedule_message}, status=403)

    if (
        version.expires_at is not None
        and timezone.now() >= version.expires_at
    ):
        return Response({"error": "This form has expired."}, status=410)

    # ...rest of function unchanged...

    submission = Submission.objects.create(
        form_version=version,
        started_at=timezone.now(),
        ip_address=request.META.get("REMOTE_ADDR"),
        status="in_progress"
    )

    return Response({
        "submission_id": submission.id,
        "started_at": submission.started_at
    }, status=status.HTTP_201_CREATED)
class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)

        if user:
            token, created = Token.objects.get_or_create(user=user)

            return Response({
                "token": token.key,
                "username": user.username
            })

        return Response(
            {"error": "Invalid username or password"},
            status=status.HTTP_401_UNAUTHORIZED
        )
GOOGLE_CLIENT_ID = "649818078001-6v5ie1iv4khakjvrcmvjb8a0vckjao0i.apps.googleusercontent.com"


def _verify_google_id_token(token):
    """
    Shared helper: verifies a Google ID token server-side and
    returns (email, name). Supports google-auth library and fallback
    to official Google Tokeninfo REST endpoint.
    """
    try:
        if id_token and google_requests:
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                GOOGLE_CLIENT_ID
            )
            email = idinfo.get("email")
            name = idinfo.get("name", "")
            if email:
                return email, name
    except Exception as exc:
        logger.warning(f"google.oauth2 verification error: {exc}")

    # Fallback to official Google tokeninfo API endpoint
    try:
        resp = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={token}",
            timeout=8
        )
        if resp.status_code == 200:
            data = resp.json()
            email = data.get("email")
            name = data.get("name", "")
            if email:
                return email, name
    except Exception as exc:
        logger.error(f"Google Tokeninfo API error: {exc}")

    raise ValueError("Invalid Google token or email missing")



class GoogleLoginView(APIView):

    def post(self, request):

        google_token = request.data.get("token")

        if not google_token:
            return Response(
                {"error": "Google token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            email, name = _verify_google_id_token(google_token)

            # Existing user
            user = User.objects.filter(email=email).first()

            # Create user if not exists
            if not user:

                username = email.split("@")[0]

                original_username = username
                counter = 1

                while User.objects.filter(username=username).exists():
                    username = f"{original_username}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=secrets.token_urlsafe(32)
                )

                name_parts = name.strip().split(" ", 1)
                user.first_name = name_parts[0]

                if len(name_parts) > 1:
                    user.last_name = name_parts[1]

                user.save()

            token, created = Token.objects.get_or_create(user=user)

            return Response({
                "token": token.key,
                "username": user.username
            })

        except ValueError as e:

            print("GOOGLE TOKEN ERROR:", e)

            return Response(
                {"error": "Invalid Google token"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        except Exception as e:

            print("GOOGLE LOGIN ERROR:", e)

            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class RespondentGoogleVerifyView(APIView):
    """
    Verifies a Google ID token for a FORM RESPONDENT — not an
    admin/dashboard user. Unlike GoogleLoginView, this does NOT
    create a Django User and does NOT issue a DRF token. It only
    confirms, via Google, which email address the person is
    currently signed into, using the same verification helper
    as admin login.

    This is what makes the frontend's "Select your email" box
    safe: the email shown there is never trusted from the
    frontend directly, only from this server-side check.
    """

    def post(self, request):

        google_token = request.data.get("token")

        if not google_token:
            return Response(
                {"error": "Google token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            email, name = _verify_google_id_token(google_token)

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            print("RESPONDENT GOOGLE VERIFY ERROR:", e)
            return Response(
                {"error": "Invalid Google token"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response({
            "email": normalize_email(email),
            "name": name,
        })


def _generate_otp_code():
    return f"{random.randint(0, 999999):06d}"


class RespondentSendOTPView(APIView):
    """
    Sends a 6-digit OTP to the given email, tied to a specific
    submission. The email must already have been confirmed via
    RespondentGoogleVerifyView on the frontend — this OTP is an
    additional verification step on top of that, not a
    replacement for it.
    """

    def post(self, request):

        submission_id = request.data.get("submission_id")
        email = normalize_email(request.data.get("email"))

        if not submission_id or not email:
            return Response(
                {"error": "submission_id and email are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"error": "Invalid email address"},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission = get_object_or_404(Submission, id=submission_id)

        code = _generate_otp_code()

        OTPVerification.objects.create(
            submission=submission,
            email=email,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        try:
            send_mail(
                subject="Your FormFlow verification code",
                message=(
                    f"Your verification code is: {code}\n\n"
                    "This code expires in 5 minutes.\n\n"
                    "If you did not request this, you can ignore this email."
                ),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None) or "noreply@formflow.app",
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception as e:
            logger.warning(
                f"OTP EMAIL WARNING for submission {submission.id}, "
                f"email {email}: {e}"
            )

        return Response({"message": "Verification code sent.", "otp": code})



class RespondentVerifyOTPView(APIView):
    """
    Verifies the OTP code for a submission + email, and only on
    success stamps that email onto the Submission as the
    verified respondent identity used for duplicate checking
    and the confirmation email.
    """

    def post(self, request):

        submission_id = request.data.get("submission_id")
        email = normalize_email(request.data.get("email"))
        code = str(request.data.get("code", "")).strip()

        if not submission_id or not email or not code:
            return Response(
                {"error": "submission_id, email and code are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission = get_object_or_404(Submission, id=submission_id)

        otp = (
            OTPVerification.objects
            .filter(submission=submission, email=email, verified=False)
            .order_by("-created_at")
            .first()
        )

        if not otp:
            return Response(
                {"error": "No pending verification found for this email."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if timezone.now() >= otp.expires_at:
            return Response(
                {"error": "This code has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp.attempts >= 5:
            return Response(
                {"error": "Too many attempts. Please request a new code."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if code != otp.code:
            otp.attempts += 1
            otp.save(update_fields=["attempts"])

            return Response(
                {"error": "Incorrect code. Please try again."},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp.verified = True
        otp.save(update_fields=["verified"])

        submission.respondent_email = email
        submission.respondent_email_verified = True
        submission.save(
            update_fields=["respondent_email", "respondent_email_verified"]
        )

        return Response({"verified": True, "email": email})
class RegisterView(APIView):

    def post(self, request):
        username = request.data.get("username")
        name = request.data.get("name")
        email = request.data.get("email")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"error": "Username and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if email and User.objects.filter(email=email).exists():
            return Response(
                {"error": "Email already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.create_user(
            username=username,
            password=password,
            email=email or ""
        )

        if name:
            name_parts = name.strip().split(" ", 1)

            user.first_name = name_parts[0]

            if len(name_parts) > 1:
                user.last_name = name_parts[1]

        user.save()

        return Response(
            {"message": "Account created successfully"},
            status=status.HTTP_201_CREATED
        )
class ProfileView(APIView):

    def get(self, request):

        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = request.user

        full_name = f"{user.first_name} {user.last_name}".strip()

        return Response({
            "username": user.username,
            "name": full_name,
            "email": user.email
        })
# ==========================================================
# CREATE ONE-TIME LINK
# ==========================================================
@csrf_exempt
def create_one_time_link(request, uuid):

    if request.method != "POST":
        return JsonResponse(
            {"error": "Only POST method is allowed."},
            status=405
        )

    try:
        form_version = FormVersion.objects.get(uuid=uuid)

    except FormVersion.DoesNotExist:
        return JsonResponse(
            {"error": "Form version not found."},
            status=404
        )

    # Default expiry = 24 hours
    expiry_hours = 24

    # If frontend sends expiry_hours, use it
    if request.body:
        try:
            data = json.loads(request.body)
            expiry_hours = int(
                data.get("expiry_hours", 24)
            )
        except (json.JSONDecodeError, ValueError, TypeError):
            return JsonResponse(
                {"error": "Invalid expiry time."},
                status=400
            )

    # Allow only these expiry durations
    allowed_expiry = [1, 6, 24, 168]

    if expiry_hours not in allowed_expiry:
        return JsonResponse(
            {"error": "Invalid expiry duration."},
            status=400
        )

    expires_at = timezone.now() + timedelta(
        hours=expiry_hours
    )

    one_time_link = OneTimeLink.objects.create(
        form_version=form_version,
        expires_at=expires_at
    )

    link = (
        f"http://localhost:5173/one-time/"
        f"{one_time_link.token}/"
    )

    return JsonResponse(
        {
            "token": str(one_time_link.token),
            "link": link,
            "expires_at": expires_at,
            "expiry_hours": expiry_hours
        },
        status=201
    )


# ==========================================================
# ONE-TIME FORM
# ==========================================================

def one_time_form(request, token):

    try:
        one_time_link = OneTimeLink.objects.select_related(
            "form_version__form"
        ).get(token=token)

    except OneTimeLink.DoesNotExist:
        return JsonResponse(
            {"error": "Invalid one-time link."},
            status=404
        )

    if one_time_link.used:
        return JsonResponse(
            {"error": "This one-time link has already been used."},
            status=400
        )
    # Check expiry
    if (
        one_time_link.expires_at is not None
        and timezone.now() >= one_time_link.expires_at
    ):
        return JsonResponse(
            {
                "error": "This one-time link has expired."
            },
            status=410
        )

    form_version = one_time_link.form_version
    form = form_version.form

    schedule_message = maybe_auto_publish_scheduled_form(form)
    if schedule_message:
        return JsonResponse({"error": schedule_message}, status=403)


    fields = Field.objects.filter(
        form_version=form_version
    ).order_by("field_order")

    field_data = []

    json_fields = form.Fields or []

    for field in fields:

        options = list(
            field.fieldoption_set
            .order_by("option_order")
            .values_list("option_text", flat=True)
        )
        if not options:
            matching_json = next(
                (jf for jf in json_fields if str(jf.get("label", "")).strip().lower() == str(field.label).strip().lower()),
                None
            )
            if matching_json and matching_json.get("options"):
                options = matching_json.get("options")


        field_data.append({
            "id": field.id,
            "label": field.label,
            "field_type": field.field_type,
            "placeholder": field.placeholder,
            "required": field.is_required,
            "min_length": field.min_length,
            "max_length": field.max_length,
            "min_value": field.min_value,
            "max_value": field.max_value,
            "min_date": field.min_date,
            "max_date": field.max_date,
            "options": options,
        })

    rules = ConditionalRule.objects.filter(
        source_field__form_version=form_version
    ).values(
        "source_field",
        "operator",
        "expected_value",
        "target_field",
        "action",
    )

    return JsonResponse({
        "form_name": form.title,
        "description": form.description,
        "version": form_version.version,
        "fields": field_data,
        "rules": list(rules),
    })


# ==========================================================
# START ONE-TIME SUBMISSION
# ==========================================================
@csrf_exempt
def start_one_time_submission(request, token):

    if request.method != "POST":
        return JsonResponse(
            {"error": "Only POST method is allowed."},
            status=405
        )

    try:
        one_time_link = OneTimeLink.objects.select_related(
            "form_version"
        ).get(token=token)

    except OneTimeLink.DoesNotExist:
        return JsonResponse(
            {"error": "Invalid one-time link."},
            status=404
        )

    if one_time_link.used:
        return JsonResponse(
            {"error": "This one-time link has already been used."},
            status=400
        )
    # Check expiry
    if (
        one_time_link.expires_at is not None
        and timezone.now() >= one_time_link.expires_at
    ):
        return JsonResponse(
            {
                "error": "This one-time link has expired."
            },
            status=410
        ) 

    # Already started
    if one_time_link.submission:
        return JsonResponse({
            "submission_id": one_time_link.submission.id,
            "started_at": one_time_link.submission.started_at,
        })

    submission = Submission.objects.create(
        form_version=one_time_link.form_version,
        started_at=timezone.now(),
        status="started",
    )

    one_time_link.submission = submission
    one_time_link.save(update_fields=["submission"])

    return JsonResponse({
        "submission_id": submission.id,
        "started_at": submission.started_at,
    })
@csrf_exempt
def submit_one_time_submission(request, token):

    if request.method != "POST":
        return JsonResponse(
            {"error": "Only POST method is allowed."},
            status=405
        )

    try:
        one_time_link = OneTimeLink.objects.select_related(
            "form_version"
        ).get(token=token)

    except OneTimeLink.DoesNotExist:
        return JsonResponse(
            {"error": "Invalid one-time link."},
            status=404
        )

    # Already used
    if one_time_link.used:
        return JsonResponse(
            {"error": "This one-time link has already been used."},
            status=400
        )
    # Check expiry
    if (
        one_time_link.expires_at is not None
        and timezone.now() >= one_time_link.expires_at
    ):
        return JsonResponse(
            {
                "error": "This one-time link has expired."
            },
            status=410
        )

    # Submission should already be started
    submission = one_time_link.submission

    if not submission:
        return JsonResponse(
            {"error": "Submission has not been started."},
            status=400
        )
        # --------------------------------------------------
    # Duplicate-email check (one-time forms)
    # --------------------------------------------------

    if one_time_link.form_version.form.limit_one_response_per_email:

        submitted_email = normalize_email(submission.respondent_email)

        if submitted_email:

            duplicate_exists = Submission.objects.filter(
                form_version__form=one_time_link.form_version.form,
                status="submitted",
                respondent_email=submitted_email,
            ).exclude(
                id=submission.id
            ).exists()

            if duplicate_exists:
                return JsonResponse(
                    {"error": "This email has already submitted this form."},
                    status=400
                )

    # --------------------------------------------------
    # Responses
    # --------------------------------------------------

    import json

    try:
        response_data = json.loads(
            request.POST.get("responses", "[]")
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid responses data."},
            status=400
        )

    for item in response_data:

        field_id = item.get("field_id")
        value = item.get("value", "")

        try:
            field = Field.objects.get(
                id=field_id,
                form_version=one_time_link.form_version
            )

        except Field.DoesNotExist:
            continue

        ResponseValue.objects.update_or_create(
            submission=submission,
            field=field,
            defaults={
                "value": str(value)
            }
        )

    # --------------------------------------------------
    # File uploads
    # --------------------------------------------------

    for key, uploaded_file in request.FILES.items():

        try:
            field_id = int(key)

            field = Field.objects.get(
                id=field_id,
                form_version=one_time_link.form_version
            )

        except (ValueError, Field.DoesNotExist):
            continue

        UploadedFile.objects.create(
            submission=submission,
            field=field,
            file=uploaded_file
        )

    # --------------------------------------------------
    # Complete submission
    # --------------------------------------------------

    submission.submitted_at = timezone.now()

    if submission.started_at:
        submission.completion_time_seconds = (
            submission.submitted_at -
            submission.started_at
        ).total_seconds()

    submission.status = "submitted"
    submission.save()

    # --------------------------------------------------
    # Mark link as used
    # --------------------------------------------------

    one_time_link.used = True
    one_time_link.used_at = timezone.now()
    one_time_link.save(
        update_fields=["used", "used_at"]
    )

    # --------------------------------------------------
    # Send confirmation email
    # (submission already saved - failure here must NOT
    # affect the successful submission response)
    # --------------------------------------------------

    email_sent = send_submission_confirmation_email(submission)

    return JsonResponse({
        "message": "Form submitted successfully.",
        "submission_id": submission.id,
        "email_sent": email_sent,
    })
@csrf_exempt
def set_public_form_expiry(request, uuid):

    if request.method != "POST":
        return JsonResponse(
            {"error": "Only POST method is allowed."},
            status=405
        )

    try:
        form_version = FormVersion.objects.get(
            uuid=uuid
        )

    except FormVersion.DoesNotExist:
        return JsonResponse(
            {"error": "Form version not found."},
            status=404
        )

    try:
        data = json.loads(request.body)

        expiry_hours = int(
            data.get("expiry_hours", 0)
        )

    except (json.JSONDecodeError, ValueError, TypeError):
        return JsonResponse(
            {"error": "Invalid expiry time."},
            status=400
        )

    allowed_expiry = [0, 1, 6, 24, 168]

    if expiry_hours not in allowed_expiry:
        return JsonResponse(
            {"error": "Invalid expiry duration."},
            status=400
        )

    # NO EXPIRY
    if expiry_hours == 0:

        form_version.expires_at = None

    # WITH EXPIRY
    else:

        form_version.expires_at = (
            timezone.now()
            + timedelta(hours=expiry_hours)
        )

    form_version.save(
        update_fields=["expires_at"]
    )

    return JsonResponse({
        "message": "Public form expiry updated successfully.",
        "expires_at": form_version.expires_at,
        "expiry_hours": expiry_hours
    })