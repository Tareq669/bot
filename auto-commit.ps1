#!/usr/bin/env pwsh
<#
.DESCRIPTION
تطبيق مراقبة تلقائية لحفظ التغييرات في Git
Auto-commit and push script for monitoring file changes
#>

# إعدادات المراقبة
$watchPath = Get-Location
$debounceMs = 2000  # وقت الانتظار بعد آخر تغيير قبل البدء بالحفظ
$lastCommitTime = Get-Date
$pendingChanges = $false

# الملفات/المجلدات المستثناة
$excludePatterns = @(
    '\.git',
    '\.vscode',
    'node_modules',
    'dist',
    'build',
    '\.env',
    '\.ps1$',
    '\.md$',
    'COMMIT_EDITMSG'
)

function Should-IgnorePath {
    param([string]$Path)
    
    foreach ($pattern in $excludePatterns) {
        if ($Path -match $pattern) {
            return $true
        }
    }
    return $false
}

function Get-PendingChanges {
    $status = & git status --porcelain 2>$null
    return $status -ne $null -and $status.Count -gt 0
}

function Auto-Commit {
    try {
        $changes = & git status --porcelain
        if ($null -eq $changes) {
            Write-Host "✅ لا توجد تغييرات جديدة" -ForegroundColor Green
            return
        }
        
        Write-Host "📝 تم اكتشاف تغييرات..." -ForegroundColor Yellow
        
        # إضافة جميع التغييرات
        & git add -A
        
        # إنشاء رسالة commit
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $commitMsg = "⏰ Auto-save: $timestamp"
        
        # عمل commit
        & git commit -m $commitMsg --quiet
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ تم حفظ التغييرات بنجاح" -ForegroundColor Green
            
            # عمل push
            & git push --quiet
            if ($LASTEXITCODE -eq 0) {
                Write-Host "🚀 تم رفع التغييرات إلى GitHub" -ForegroundColor Green
            } else {
                Write-Host "❌ فشل في رفع التغييرات" -ForegroundColor Red
            }
        }
    }
    catch {
        Write-Host "❌ خطأ: $_" -ForegroundColor Red
    }
}

# إنشاء file watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $watchPath
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite
$watcher.EnableRaisingEvents = $true

# معالج التغييرات
$onChanged = {
    $path = $Event.SourceEventArgs.FullPath
    
    if (Should-IgnorePath $path) {
        return
    }
    
    $global:pendingChanges = $true
}

# تسجيل معالج التغييرات
Register-ObjectEvent -InputObject $watcher -EventName "Changed" -Action $onChanged | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Created" -Action $onChanged | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Deleted" -Action $onChanged | Out-Null

Write-Host "🔍 جاري مراقبة التغييرات..." -ForegroundColor Cyan
Write-Host "📂 المسار: $watchPath" -ForegroundColor Cyan
Write-Host "⏸️  اضغط Ctrl+C للخروج" -ForegroundColor Yellow
Write-Host ""

# حلقة المراقبة الرئيسية
while ($true) {
    if ($global:pendingChanges) {
        Start-Sleep -Milliseconds $debounceMs
        
        # التحقق من وجود تغييرات فعلية
        if (Get-PendingChanges) {
            Auto-Commit
            $global:lastCommitTime = Get-Date
        }
        
        $global:pendingChanges = $false
    }
    
    Start-Sleep -Milliseconds 500
}
