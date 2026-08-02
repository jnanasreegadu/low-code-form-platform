from django.contrib import admin
from .models import (
    Form,
    FormVersion,
    Field,
    FieldOption,
    ConditionalRule,
    Submission,
    ResponseValue,
)

admin.site.register(Form)
admin.site.register(FormVersion)
admin.site.register(Field)
admin.site.register(FieldOption)
admin.site.register(ConditionalRule)
admin.site.register(Submission)
admin.site.register(ResponseValue)
