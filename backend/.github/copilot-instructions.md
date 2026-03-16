# Copilot Instructions for this Backend

## Build, test, and lint commands

### Build / runtime prep
- Install dependencies: `python -m pip install -r requirements.txt`
- Optional test dependency sets:
  - `python -m pip install -r requirements-test.txt`
  - `python -m pip install -r requirements-playwright.txt`
- Apply schema updates: `python manage.py migrate --noinput`
- Collect static assets (used in CI deploy workflow): `python manage.py collectstatic --noinput`
- Start local server: `python manage.py runserver`

### Tests
- Run current Django test modules: `python manage.py test events scores`
- Run a single test class: `python manage.py test scores.tests.StudentRecheckEndpointsTestCase`
- Run a single test method: `python manage.py test events.tests.VolunteerParticipantFlowTestCase.test_volunteer_can_verify_participant_by_chess_number_when_event_published`
- Script-style smoke tests at repo root:
  - `python test_auth.py`
  - `python test_sentiment.py`
  - `python test_cors_configuration.py`
  - `python test_razorpay_integration.py`
  - `python manage.py profile_api_latency --runs 1 --warmup 0` (endpoint latency/query profiling)

### Lint
- No repo-defined lint command/config was found (`pyproject.toml`, `setup.cfg`, `tox.ini`, `.flake8` are absent).


## MCP server context

- Default Supabase project for this backend: `eKalolsavamDB`
  - `project_id`: `zmgnupdztoxmbnpeeiai`
  - `organization_id`: `qaxaocttrpcjcktqmhog`
  - `db_host`: `db.zmgnupdztoxmbnpeeiai.supabase.co`
- Prefer this project ID for Supabase MCP operations unless the user explicitly asks for another project.
- Database schema is currently Django-managed (`django_migrations` has applied entries while Supabase migration history is empty), so keep schema changes aligned with Django migrations.


## High-level architecture

- This is a Django + DRF monolith. Project config and top-level routing live in `e_kalolsavam/settings.py` and `e_kalolsavam/urls.py`.
- APIs are mounted by domain under `/api/...`:
  - `users` (`/api/auth/`): auth, admin user ops, allowed-email management, school/ID workflow
  - `catalog` (`/api/catalog/`): event definitions, variants, and rule metadata
  - `events` (`/api/events/`): venues, scheduled events, registrations, judge/volunteer participant flows
  - `scores` (`/api/scores/`): scoring, results, recheck workflow, anomaly and prediction endpoints
  - `certificates`, `feedback`, `notifications`, `volunteers`, `emergencies`, `core`
- Data flow is layered:
  - `catalog` defines event metadata/rules
  - `events.Event` schedules actual events (optionally linked to catalog definitions/variants)
  - `scores.Score` aggregates judge input and feeds `Result`
  - `scores.RecheckRequest` + `RazorpayPayment` implement result recheck/payment lifecycle
- Auth is based on a custom `users.User` model (role + approval_status), JWT (`simplejwt`), and optional Google OAuth (`social_django` pipeline).


## Key conventions in this repository

- Default API protection is global in settings: authenticated users only, plus approval gating via `users.permissions_approval.IsApprovedUser`. Public endpoints must explicitly set `AllowAny`.
- Role/approval behavior is business-critical:
  - judges/volunteers must be `approved`
  - rejected students are blocked
  - admin deactivation/role changes/deletion must not remove the last active admin (`users/services/admin_user_service.py`)
- Service modules hold core business logic and should be reused from views:
  - `users/services/*` for auth, registration, password, and admin-user operations
  - `scores/services.py` for recheck request lifecycle and volunteer assignment
  - `events/services/event_state.py` for event status transitions
- Event status must follow `VALID_TRANSITIONS` in `events/services/event_state.py` (do not bypass with arbitrary direct status changes).
- Test style is intentionally mixed:
  - real Django `TestCase` suites are in app `tests.py` files (currently `events/tests.py`, `scores/tests.py`)
  - root `test_*.py` files are manual smoke scripts and may assume a running local server
- Existing factories (`*/factories.py`) use `factory_boy`; prefer extending these instead of creating ad-hoc fixtures.
- DB config precedence in settings is: `USE_SQLITE=True` -> `DATABASE_URL` (Postgres via `dj_database_url`) -> legacy MySQL env vars.
- Username authentication is case-insensitive via `users/backends.py` and reinforced in `users/services/auth_service.py`.
- Admin users endpoint (`/api/auth/users/`) is paginated by default; pass `?all=true` only when full-list payload is explicitly needed.
