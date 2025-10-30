# Fix App.js
$content = Get-Content 'src\App.js' -Raw
$content = $content -replace "import Dashboard from '.\/pages\/Dashboard';\r?\n?", ""
$content = $content -replace "const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);\r?\n?", ""
Set-Content 'src\App.js' $content

# Fix AllowedEmailsManager.js
$content = Get-Content 'src\components\AllowedEmailsManager.js' -Raw
$content = $content -replace "const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);\r?\n?", ""
Set-Content 'src\components\AllowedEmailsManager.js' $content

# Fix VolunteerDashboard.js
$content = Get-Content 'src\pages\VolunteerDashboard.js' -Raw
$content = $content -replace "const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);\r?\n?", ""
Set-Content 'src\pages\VolunteerDashboard.js' $content

# Fix LandingPage.js
$content = Get-Content 'src\pages\LandingPage.js' -Raw
$content = $content -replace "const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);\r?\n?", ""
Set-Content 'src\pages\LandingPage.js' $content

# Fix JudgeDashboard.js
$content = Get-Content 'src\pages\JudgeDashboard.js' -Raw
$content = $content -replace "const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);\r?\n?", ""
Set-Content 'src\pages\JudgeDashboard.js' $content

Write-Host "All fixes applied!" -ForegroundColor Green
