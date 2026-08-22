@echo off
REM Sambungkan HP ke server lewat kabel USB (adb reverse).
REM Jalankan ulang file ini SETIAP KALI kabel USB dicabut / HP restart.
set ADB="C:\Program Files\3uAirPlayer\adb\adb.exe"

echo Mengecek HP terhubung...
%ADB% devices

%ADB% reverse tcp:8000 tcp:8000
if %errorlevel%==0 (
    echo.
    echo BERHASIL! Buka di HP: http://localhost:8000
) else (
    echo.
    echo GAGAL. Pastikan USB debugging aktif dan kabel terpasang.
)
pause
