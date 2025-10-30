from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, AllowedEmail

# Import workflow models only for admin registration
from . import workflow_models

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff', 'created_at')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-created_at',)
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'phone', 'created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

@admin.register(AllowedEmail)
class AllowedEmailAdmin(admin.ModelAdmin):
    list_display = ('email', 'is_active', 'created_by', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('email', 'created_by__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating a new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    actions = ['activate_emails', 'deactivate_emails']
    
    def activate_emails(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} email(s) activated successfully.')
    activate_emails.short_description = "Activate selected emails"
    
    def deactivate_emails(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} email(s) deactivated successfully.')
    deactivate_emails.short_description = "Deactivate selected emails"


@admin.register(workflow_models.AdminIssuedID)
class AdminIssuedIDAdmin(admin.ModelAdmin):
    list_display = ('id_code', 'role', 'created_by', 'is_used', 'used_at', 'created_at')
    list_filter = ('role', 'is_used', 'created_at')
    search_fields = ('id_code', 'created_by__username', 'used_by__username')
    readonly_fields = ('created_at', 'used_at', 'used_by')


@admin.register(workflow_models.SchoolParticipant)
class SchoolParticipantAdmin(admin.ModelAdmin):
    list_display = ('participant_id', 'first_name', 'last_name', 'student_class', 
                   'school', 'verified_by_volunteer', 'submitted_at')
    list_filter = ('verified_by_volunteer', 'submitted_at', 'student_class')
    search_fields = ('participant_id', 'first_name', 'last_name', 'school__username')
    filter_horizontal = ('events',)
    readonly_fields = ('submitted_at', 'verified_by_volunteer', 'verified_at')


@admin.register(workflow_models.SchoolVolunteerAssignment)
class SchoolVolunteerAssignmentAdmin(admin.ModelAdmin):
    list_display = ('school', 'volunteer', 'assigned_at', 'is_active', 'assigned_by')
    list_filter = ('is_active', 'assigned_at')
    search_fields = ('school__username', 'volunteer__username', 'assigned_by__username')
    readonly_fields = ('assigned_at', 'assigned_by')


@admin.register(workflow_models.SchoolStanding)
class SchoolStandingAdmin(admin.ModelAdmin):
    list_display = ('school', 'total_points', 'total_gold', 'total_silver', 'total_bronze', 
                   'total_participants', 'last_updated')
    list_filter = ('last_updated',)
    search_fields = ('school__username',)
    readonly_fields = ('last_updated',)
    ordering = ('-total_points', '-total_gold')


@admin.register(workflow_models.IDSignupRequest)
class IDSignupRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'issued_id', 'status', 'requested_at', 'reviewed_by', 'reviewed_at')
    list_filter = ('status', 'requested_at', 'reviewed_at')
    search_fields = ('user__username', 'user__email', 'issued_id__id_code', 'notes')
    readonly_fields = ('requested_at', 'reviewed_at', 'reviewed_by')