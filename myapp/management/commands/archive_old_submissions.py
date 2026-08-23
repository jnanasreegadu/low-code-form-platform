from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from myapp.models import Submission


class Command(BaseCommand):

    help = "Archive submissions older than their form retention period"

    def handle(self, *args, **kwargs):

        now = timezone.now()

        submissions = Submission.objects.filter(
            status="submitted",
            submitted_at__isnull=False
        ).select_related(
            "form_version__form"
        )

        archived_count = 0

        for submission in submissions:

            form = submission.form_version.form

            retention_days = form.retention_days or 365

            expiry_date = now - timedelta(
                days=retention_days
            )

            if submission.submitted_at < expiry_date:

                submission.status = "archived"

                submission.save(
                    update_fields=["status"]
                )

                archived_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"{archived_count} submissions archived successfully."
            )
        )