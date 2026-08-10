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
from datetime import datetime
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
from django.http import HttpResponse
from django.contrib.auth.models import User
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

        # Save fields into Field table
        for index, item in enumerate(data.get("fields", []), start=1):

            field = Field.objects.create(
                form_version=version,
                label=item["label"],
                field_type=item["type"].lower(),
                placeholder=item.get("placeholder", ""),
                is_required=item.get("required", False),
                min_length=item.get("min_length"),
                max_length=item.get("max_length"),
                min_value=item.get("min_value"),
                max_value=item.get("max_value"),
                field_order=index,
            )

            # Save dropdown options
            if item["type"] == "Dropdown":
                for i, option in enumerate(item.get("options", []), start=1):
                    FieldOption.objects.create(
                        field=field,
                        option_text=option,
                        option_order=i,
                    )

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
                    min_length=item.get("min_length"),
                    max_length=item.get("max_length"),
                    min_value=item.get("min_value"),
                    max_value=item.get("max_value"),
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

        # Copy fields
        for index, item in enumerate(form.Fields, start=1):

            new_field = Field.objects.create(
                form_version=new_version,
                label=item["label"],
                field_type=item["type"].lower(),
                placeholder=item.get("placeholder", ""),
                is_required=item.get("required", False),
                min_length=item.get("min_length"),
                max_length=item.get("max_length"),
                min_value=item.get("min_value"),
                max_value=item.get("max_value"),
                field_order=index,
            )

            if item["type"] == "Dropdown":
                for i, option in enumerate(item.get("options", []), start=1):
                    FieldOption.objects.create(
                        field=new_field,
                        option_text=option,
                        option_order=i,
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
            "form_id": form.id,
            "form_name": form.title,
            "version": latest_version.version,
            "fields": [],
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
@action(detail=True, methods=["post"])
def submit(self, request, pk=None):
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

    submission = Submission.objects.create(
        form_version=latest_version,
        ip_address=request.META.get("REMOTE_ADDR"),
    )

    responses = request.data.get("responses", [])

    # ==========================================================
    # 1. VALIDATION
    # ==========================================================

    for item in responses:

        field = Field.objects.get(id=item["field_id"])

        # File field
        if field.field_type == ["file", "file upload"]:
            uploaded_file = request.FILES.get(str(field.id))

            if field.is_required and not uploaded_file:
                return Response(
                    {
                        "error": f"{field.label} is required"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            continue

        value = str(item.get("value", "")).strip()

        # Required Validation
        if field.is_required and value == "":
            return Response(
                {
                    "error": f"{field.label} is required"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Email Validation
        if field.field_type == "email":
            try:
                validate_email(value)
            except ValidationError:
                return Response(
                    {
                        "error": f"Invalid email for {field.label}"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

    # ==========================================================
    # 2. SAVE RESPONSES + FILES
    # ==========================================================

    for item in responses:

        try:
            field = Field.objects.get(
                id=item["field_id"]
            )

            # --------------------------------------------------
            # FILE UPLOAD
            # --------------------------------------------------

            if field.field_type == ["file","file upload"]:

                uploaded_file = request.FILES.get(
                    str(field.id)
                )

                if uploaded_file:

                    UploadedFile.objects.create(
                        submission=submission,
                        field=field,
                        file=uploaded_file,
                    )

                    ResponseValue.objects.create(
                        submission=submission,
                        field=field,
                        value=uploaded_file.name,
                    )

                continue

            # --------------------------------------------------
            # NORMAL FIELD
            # --------------------------------------------------

            ResponseValue.objects.create(
                submission=submission,
                field=field,
                value=item.get("value", ""),
            )

        except Field.DoesNotExist:
            pass

    return Response(
        {
            "message": "Form submitted successfully"
        },
        status=status.HTTP_201_CREATED,
    )

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
def responses(self, request):
    submissions = Submission.objects.filter(
        form_version__form__owner=request.user
    ).order_by("-submitted_at")

    data = []   
    
    for submission in submissions:
        response_values = ResponseValue.objects.filter(
            submission=submission
        )

        responses = []

        for response in response_values:

                file_url = None

                if response.field.field_type in ["file", "file upload"]:
                    uploaded_file = UploadedFile.objects.filter(
                        submission=submission,
                        field=response.field
                    ).first()

                    if uploaded_file:
                        file_url = request.build_absolute_uri(
                            uploaded_file.file.url
                        )

                    responses.append({
                        "field": response.field.label,
                        "value": response.value,
                        "file_url": file_url,
                    })

                data.append({
                    "submission_id": submission.id,
                    "form_version": submission.form_version.version,
                    "submitted_at": submission.submitted_at,
                    "responses": responses,
                })

        return Response(data)

    @action(detail=False, methods=["get"])
    def export(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="responses.csv"'

        writer = csv.writer(response)

        writer.writerow([
            "Submission ID",
            "Field",
            "Answer",
        ])

        submissions = Submission.objects.all()

        for submission in submissions:
            values = ResponseValue.objects.filter(submission=submission)

            for value in values:
                writer.writerow([
                    submission.id,
                    value.field.label,
                    value.value,
                ])

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

        for rule in rules:

            condition_met = evaluate_condition(
                rule,
                submitted_data
            )

            if not condition_met:
                continue

            # HIDE rule
            if rule.action == "hide":
                hidden_fields.add(rule.target_field_id)

            # REQUIRE rule
            elif rule.action == "require":
                required_fields.add(rule.target_field_id)

        # ==========================================================
        # 5. SERVER-SIDE VALIDATION
        # ==========================================================

        for field in fields:

            value = submitted_data.get(
                field.id,
                ""
            )
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
            # Hidden field validation
            # ------------------------------------------------------

            if field.id in hidden_fields:

                if value != "":
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
                    datetime.strptime(value, "%Y-%m-%d")

                except ValueError:
                    return Response(
                        {
                            "error": "Invalid date. Please recheck."
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

        submission = Submission.objects.create(
            form_version=form_version,
            ip_address=request.META.get("REMOTE_ADDR"),
            status="submitted"
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

    return Response(data)
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

        user = User.objects.create_user(
            username=username,
            password=password
        )

        return Response(
            {"message": "Account created successfully"},
            status=status.HTTP_201_CREATED
        )