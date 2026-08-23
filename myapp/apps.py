import sys
from django.apps import AppConfig


class MyappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'myapp'

    def ready(self):
        # Automatically apply pending migrations on server startup
        if any(cmd in sys.argv[0] for cmd in ['runserver', 'gunicorn', 'wsgi', 'asgi']) or 'runserver' in sys.argv:
            try:
                from django.core.management import call_command
                call_command('migrate', interactive=False)
            except Exception as e:
                print(f"Auto-migration warning: {e}")

