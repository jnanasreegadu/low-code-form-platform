from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from myapp.models import Form, Submission, AuditLog


class Command(BaseCommand):
    help = "Auto-archive and cleanup submissions older than form retention_days"

    def handle(self, *args, **options):
        now = timezone.now()
        forms = Form.objects.filter(retention_days__isnull=False)
        total_cleaned = 0

        for form in forms:
            retention_days = form.retention_days
            if retention_days <= 0:
                continue

            cutoff_date = now - timedelta(days=retention_days)
            expired_submissions = Submission.objects.filter(
                form_version__form=form,
                submitted_at__lt=cutoff_date
            ).exclude(status="deleted")

            affected_ids = list(expired_submissions.values_list("id", flat=True))

            if affected_ids:
                expired_submissions.update(status="deleted")

                AuditLog.objects.create(
                    user=form.owner,
                    action="RETENTION_AUTO_CLEANUP",
                    affected_submissions=affected_ids
                )

                count = len(affected_ids)
                total_cleaned += count
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Archived {count} submissions for Form '{form.title}' (ID: {form.id}) older than {retention_days} days."
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(f"Retention cleanup finished. Total submissions archived: {total_cleaned}")
        )
