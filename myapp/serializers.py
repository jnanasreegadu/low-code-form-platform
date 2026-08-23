from rest_framework import serializers
from .models import Form, Field,FormVersion
from .models import ConditionalRule


class ConditionalRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConditionalRule
        fields = "__all__"

class FormSerializer(serializers.ModelSerializer):

    latest_version = serializers.SerializerMethodField()
    latest_uuid = serializers.SerializerMethodField()
    conditional_rules = serializers.SerializerMethodField()

    class Meta:
        model = Form
        fields = "__all__"

    def get_latest_version(self, obj):
        try:
            latest = (
                FormVersion.objects
                .filter(form=obj)
                .order_by("-version")
                .first()
            )
            return latest.version if latest else 0
        except Exception:
            return 0

    def get_latest_uuid(self, obj):
        try:
            latest = (
                FormVersion.objects
                .filter(form=obj, is_published=True)
                .order_by("-version")
                .first()
            )
            return str(latest.uuid) if latest else None
        except Exception:
            return None

    def get_conditional_rules(self, obj):
        try:
            latest_version = (
                FormVersion.objects
                .filter(form=obj, is_published=True)
                .order_by("-version")
                .first()
            )

            if not latest_version:
                latest_version = (
                    FormVersion.objects
                    .filter(form=obj)
                    .order_by("-version")
                    .first()
                )

            if not latest_version:
                return []

            rules = ConditionalRule.objects.filter(
                source_field__form_version=latest_version,
                target_field__form_version=latest_version
            ).select_related(
                "source_field",
                "target_field"
            )

            results = []
            for rule in rules:
                if not getattr(rule, "source_field", None) or not getattr(rule, "target_field", None):
                    continue
                results.append({
                    "id": rule.id,
                    "source_field_id": rule.source_field.id,
                    "source_field_label": getattr(rule.source_field, "label", ""),
                    "operator": rule.operator,
                    "expected_value": rule.expected_value,
                    "target_field_id": rule.target_field.id,
                    "target_field_label": getattr(rule.target_field, "label", ""),
                    "action": rule.action,
                })
            return results
        except Exception:
            return []


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
