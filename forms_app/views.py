from rest_framework import viewsets
from .models import (
    Form,
    FormVersion,
    Field,
    FieldOption,
    ConditionalRule,
    Submission,
    ResponseValue,
)

from .serializers import (
    FormSerializer,
    FormVersionSerializer,
    FieldSerializer,
    FieldOptionSerializer,
    ConditionalRuleSerializer,
    SubmissionSerializer,
    ResponseValueSerializer,
)


class FormViewSet(viewsets.ModelViewSet):
    queryset = Form.objects.all()
    serializer_class = FormSerializer


class FormVersionViewSet(viewsets.ModelViewSet):
    queryset = FormVersion.objects.all()
    serializer_class = FormVersionSerializer


class FieldViewSet(viewsets.ModelViewSet):
    queryset = Field.objects.all()
    serializer_class = FieldSerializer


class FieldOptionViewSet(viewsets.ModelViewSet):
    queryset = FieldOption.objects.all()
    serializer_class = FieldOptionSerializer


class ConditionalRuleViewSet(viewsets.ModelViewSet):
    queryset = ConditionalRule.objects.all()
    serializer_class = ConditionalRuleSerializer


class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer


class ResponseValueViewSet(viewsets.ModelViewSet):
    queryset = ResponseValue.objects.all()
    serializer_class = ResponseValueSerializer

# Create your views here.
