from rest_framework import serializers


class ErrorEnvelopeSerializer(serializers.Serializer):
    error = serializers.CharField()
    detail = serializers.CharField()
    code = serializers.CharField(required=False)
    details = serializers.JSONField(required=False)


class HealthCheckStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    message = serializers.CharField()
    engine = serializers.CharField(required=False)
    user_count = serializers.IntegerField(required=False)
    jwt_configured = serializers.BooleanField(required=False)
    oauth_configured = serializers.BooleanField(required=False)
    app_installed = serializers.BooleanField(required=False)
    middleware_configured = serializers.BooleanField(required=False)
    allowed_origins = serializers.IntegerField(required=False)
    missing_variables = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    debug_mode = serializers.BooleanField(required=False)
    static_url = serializers.BooleanField(required=False)
    static_root = serializers.BooleanField(required=False)
    whitenoise_configured = serializers.BooleanField(required=False)


class HealthCheckChecksSerializer(serializers.Serializer):
    database = HealthCheckStatusSerializer()
    authentication = HealthCheckStatusSerializer()
    cors = HealthCheckStatusSerializer()
    environment = HealthCheckStatusSerializer()
    static_files = HealthCheckStatusSerializer()


class HealthCheckResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    timestamp = serializers.DateTimeField()
    version = serializers.CharField()
    environment = serializers.CharField()
    checks = HealthCheckChecksSerializer()


class SystemInfoResponseSerializer(serializers.Serializer):
    python_version = serializers.CharField()
    django_version = serializers.CharField()
    debug_mode = serializers.BooleanField()
    allowed_hosts = serializers.ListField(child=serializers.CharField())
    installed_apps_count = serializers.IntegerField()
    middleware_count = serializers.IntegerField()
    database_engine = serializers.CharField()
    timezone = serializers.CharField()
    language_code = serializers.CharField()
    cors_enabled = serializers.BooleanField()
    jwt_enabled = serializers.BooleanField()
    oauth_enabled = serializers.BooleanField()
