# PostgreSQL Setup Script for POS System
Write-Host "Setting up PostgreSQL database..." -ForegroundColor Green

# Check if PostgreSQL is installed
$pgPath = Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $pgPath) {
    Write-Host "PostgreSQL not found. Please install PostgreSQL first." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

$pgVersion = $pgPath.Name
$pgBin = "C:\Program Files\PostgreSQL\$pgVersion\bin"

Write-Host "Found PostgreSQL version: $pgVersion" -ForegroundColor Green

# Add PostgreSQL to PATH for this session
$env:PATH = "$pgBin;$env:PATH"

# Check if service is running
$service = Get-Service | Where-Object {$_.Name -like "*postgresql*$pgVersion*"} | Select-Object -First 1
if ($service) {
    if ($service.Status -ne 'Running') {
        Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
        Start-Service $service.Name
        Start-Sleep -Seconds 3
    }
    Write-Host "PostgreSQL service is running" -ForegroundColor Green
} else {
    Write-Host "PostgreSQL service not found. Please start it manually." -ForegroundColor Yellow
}

# Try to create database
Write-Host "Creating database 'pos_system'..." -ForegroundColor Yellow
$env:PGPASSWORD = "postgres"
& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE pos_system;" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database created successfully!" -ForegroundColor Green
} else {
    Write-Host "Database might already exist or there was an error." -ForegroundColor Yellow
    Write-Host "Trying to connect to existing database..." -ForegroundColor Yellow
    & "$pgBin\psql.exe" -U postgres -d pos_system -c "SELECT 1;" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database connection successful!" -ForegroundColor Green
    } else {
        Write-Host "Please check your PostgreSQL password in backend/.env" -ForegroundColor Red
        Write-Host "Default password is usually set during installation." -ForegroundColor Yellow
    }
}

Write-Host "`nSetup complete! Now run: cd backend && npm run seed" -ForegroundColor Green

