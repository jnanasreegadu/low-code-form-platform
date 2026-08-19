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
from django.core import signing
from datetime import datetime
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate
from django.utils.dateparse import parse_datetime
from .models import (
    Form,
    Field,
    FormVersion,
    FieldOption,
    Submission,
    ResponseValue,
    ConditionalRule,
    UploadedFile,
)


from .serializers import (
    FormSerializer,
    FieldSerializer,
    SubmissionSerializer,
    ConditionalRuleSerializer,
)
class FormViewSet(viewsets.ModelViewSet):
    queryset = Form.objects.all()
    serializer_class = FormSerializer

    def get_queryset(self):
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
            Fields=data.get("fields", [])
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
            if item["type"] == "Dropdown":
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
            print("UPDATE API HIT")

            form = self.get_object()
            print("FORM ID:", form.id)
            print("STATUS BEFORE:", form.status)

            data = request.data

            form.title = data.get("title", form.title)
            form.description = data.get("description", form.description)
            form.Fields = data.get("Fields", form.Fields)
            form.save()

            print("STATUS AFTER:", form.status)

            if form.status == "published":
                print("ENTERED VERSION BLOCK")

                # Old published version ni unpublished cheyyi
                FormVersion.objects.filter(
                    form=form,
                    is_published=True
                ).update(is_published=False)

                # Next version number
                version_no = (
                    FormVersion.objects.filter(form=form).count() + 1
                )

                # Create new version
                new_version = FormVersion.objects.create(
                    form=form,
                    version=version_no,
                    is_published=True,
                )

                # Save latest fields into new version
                for index, item in enumerate(data.get("Fields", []), start=1):

                    new_field = Field.objects.create(
                            form_version=new_version,
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

                    if item["type"] == "Dropdown":
                        for i, option in enumerate(
                            item.get("options", []),
                            start=1,
                        ):
                            FieldOption.objects.create(
                                field=new_field,
                                option_text=option,
                                option_order=i,
                            )

            return Response(
                FormSerializer(form).data,
                status=status.HTTP_200_OK,
                )


    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):

        form = self.get_object()
        FormVersion.objects.filter(
            form=form,
            is_published=True
        ).update(is_published=False)

        # Publish form
        form.status = "published"
        form.save()

        # Create new version
        latest_version = FormVersion.objects.filter(form=form).count() + 1

        new_version = FormVersion.objects.create(
            form=form,
            version=latest_version,
            is_published=True,
        )
        # Map old frontend field IDs to new backend fields
        field_map = {}
        # Copy fields
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

            if item["type"] == "Dropdown":
                for i, option in enumerate(item.get("options", []), start=1):
                    FieldOption.objects.create(
                        field=new_field,
                        option_text=option,
                        option_order=i,
                    )
        # Copy conditional rules
        # Copy conditional rules from previous version
        old_version = (
            FormVersion.objects
            .filter(form=form)
            .exclude(id=new_version.id)
            .order_by("-version")
            .first()
        )

        if old_version:

            old_fields = {
                field.field_order: field
                for field in Field.objects.filter(
                    form_version=old_version
                )
            }

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

                source_field = new_fields.get(
                    rule.source_field.field_order
                )

                target_field = new_fields.get(
                    rule.target_field.field_order
                )

                if source_field and target_field:

                    ConditionalRule.objects.create(
                        source_field=source_field,
                        operator=rule.operator,
                        expected_value=rule.expected_value,
                        target_field=target_field,
                        action=rule.action
                    )
        return Response({"message": "Form published successfully"})
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

        latest_version = (
            FormVersion.objects.filter(
                form=form,
                is_published=True,
            )
            .order_by("-version")
            .first()
        )

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

    @action(detail=False, methods=["get"])
    def responses(self, request):

        # ==========================================================
        # 1. GET ONLY LOGGED-IN USER'S RESPONSES
        # ==========================================================

        submissions = Submission.objects.filter(
            form_version__form__owner=request.user
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



        # ==========================================================
        # 8. RETURN RESPONSE ID
        # ==========================================================

        return Response(
            {
                "response_id": f"RESP-{submission.id}",
                "message": "Submitted Successfully"
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

        for field in fields:
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
                "options": [
                    option.option_text
                    for option in FieldOption.objects.filter(field=field)
                ],
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