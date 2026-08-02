from rest_framework import serializers
from .models import Form, Field
from .models import ConditionalRule

class FormSerializer(serializers.ModelSerializer):
    class Meta:
        model = Form
        fields = "__all__"


class FieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = Field
        fields = "__all__"
from .models import Submission, ResponseValue

class ResponseValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResponseValue
        fields = "__all__"
        read_only_fields = ["submission"]


class SubmissionSerializer(serializers.ModelSerializer):
    responses = ResponseValueSerializer(many=True, write_only=True)

    class Meta:
        model = Submission
        fields = ["id", "form_version", "submitted_at", "ip_address", "status", "responses"]
        read_only_fields = ["submitted_at"]

    def create(self, validated_data):
        responses = validated_data.pop("responses")

        submission = Submission.objects.create(**validated_data)

        for response in responses:
            ResponseValue.objects.create(
                submission=submission,
                field=response["field"],
                value=response["value"]
            )

        return submission
class ConditionalRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConditionalRule
        fields = "__all__"