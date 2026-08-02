from rest_framework import serializers
from .models import (
    Form,
    FormVersion,
    Field,
    FieldOption,
    ConditionalRule,
    Submission,
    ResponseValue,
)


class FieldOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldOption
        fields = '__all__'


class FieldSerializer(serializers.ModelSerializer):
    options = FieldOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Field
        fields = '__all__'


class FormSerializer(serializers.ModelSerializer):
    fields = FieldSerializer(many=True, read_only=True)

    class Meta:
        model = Form
        fields = '__all__'


class FormVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormVersion
        fields = '__all__'


class ConditionalRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConditionalRule
        fields = '__all__'


class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = '__all__'


class ResponseValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResponseValue
        fields = '__all__'