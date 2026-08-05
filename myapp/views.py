from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework import status
import csv
from django.http import HttpResponse
from .models import (
    Form,
    Field,
    FormVersion,
    FieldOption,
    Submission,
    ResponseValue,
    ConditionalRule,
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

    def create(self, request):
        data = request.data

        # Create Form
        form = Form.objects.create(
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
        print(request.data)
        form = self.get_object()

        data = request.data

        form.title = data.get("title", form.title)
        form.description = data.get("description", form.description)
        form.Fields = data.get("Fields", form.Fields)

        form.save()

        return Response(
            FormSerializer(form).data,
            status=status.HTTP_200_OK,
        )

    

        return super().update(request, *args, **kwargs)
    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        form = self.get_object()

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

        for item in responses:
            try:
                field = Field.objects.get(id=item["field_id"])

                ResponseValue.objects.create(
                    submission=submission,
                    field=field,
                    value=item["value"],
                )

            except Field.DoesNotExist:
                pass

        return Response(
            {"message": "Form submitted successfully"},
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

class SubmissionViewSet(viewsets.ModelViewSet):

    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer

    @action(detail=False, methods=["get"])
    def count(self, request):
        return Response({
            "count": Submission.objects.count()
        })

    @action(detail=False, methods=["get"])
    def responses(self, request):
        submissions = Submission.objects.all().order_by("-submitted_at")

        data = []

        for submission in submissions:
            response_values = ResponseValue.objects.filter(submission=submission)

            responses = []

            for response in response_values:
                responses.append({
                    "field": response.field.label,
                    "value": response.value,
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
class ConditionalRuleViewSet(viewsets.ModelViewSet):
    queryset = ConditionalRule.objects.all()
    serializer_class = ConditionalRuleSerializer
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