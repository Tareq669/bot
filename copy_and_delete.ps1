$source = "c:\Users\Reem\Desktop\بوت\bot"
$dest = "c:\Users\Reem\Desktop\بوت"

Write-Host "بدء النسخ من $source إلى $dest"

# Copy all items recursively
Copy-Item -Path "$source\*" -Destination "$dest" -Recurse -Force -ErrorAction Continue

Write-Host "انتهى النسخ، جاري حذف المجلد..."

# Remove the source directory
Remove-Item -Path "$source" -Recurse -Force -ErrorAction Continue

Write-Host "✅ تم النسخ والحذف بنجاح!"

# Verify
if (-not (Test-Path "$source")) {
    Write-Host "✅ تم التحقق: مجلد bot محذوف"
} else {
    Write-Host "❌ خطأ: مجلد bot لا يزال موجوداً"
}
