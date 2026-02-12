#!/usr/bin/env pwsh
<#
.DESCRIPTION
سكريبت حفظ تلقائي بسيط - يتحقق كل 5 ثوانٍ
Simple auto-save script - checks every 5 seconds
#>

$checkInterval = 5000  # كل 5 ثوانٍ
$lastHash = ""

Write-Host "🔄 سكريبت الحفظ التلقائي قيد التشغيل..." -ForegroundColor Cyan
Write-Host "⏸️  اضغط Ctrl+C للخروج" -ForegroundColor Yellow
Write-Host ""

while ($true) {
    try {
        # الحصول على حالة Git
        $status = & git status --porcelain 2>$null
        $currentHash = $status | ConvertTo-Json | Get-FileHash -Algorithm SHA256 -InputStream
        
        # إذا تغيرت الحالة
        if ($currentHash -ne $lastHash) {
            $lastHash = $currentHash
            
            if ($null -ne $status) {
                Write-Host "📝 تم اكتشاف تغييرات في $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Yellow
                
                # إضافة وحفظ ودفع
                & git add -A 2>$null
                $commitMsg = "⏰ Auto-save: $(Get-Date -Format 'HH:mm:ss')"
                & git commit -m $commitMsg --quiet 2>$null
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ تم الحفظ" -ForegroundColor Green
                    
                    & git push --quiet 2>$null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "🚀 تم الرفع" -ForegroundColor Green
                    }
                }
            }
        }
    }
    catch {
        # تجاهل الأخطاء والمتابعة
    }
    
    Start-Sleep -Milliseconds $checkInterval
}
