@echo off
chcp 65001 >nul
echo ========================================
echo   Обновление проекта и деплой на Vercel
echo ========================================
echo.

echo [1/3] Добавляю изменения...
git add .
if %errorlevel% neq 0 (
    echo ОШИБКА: Не удалось добавить изменения
    pause
    exit /b 1
)
echo ✓ Изменения добавлены
echo.

echo [2/3] Создание коммита...
echo Введите описание изменений (например: "Исправил баг" или "Добавил новую функцию"):
set /p message="> "
if "%message%"=="" (
    echo ОШИБКА: Описание не может быть пустым
    pause
    exit /b 1
)
git commit -m "%message%"
if %errorlevel% neq 0 (
    echo ОШИБКА: Не удалось создать коммит
    pause
    exit /b 1
)
echo ✓ Коммит создан: %message%
echo.

echo [3/3] Загружаю на GitHub...
git push
if %errorlevel% neq 0 (
    echo ОШИБКА: Не удалось загрузить на GitHub
    pause
    exit /b 1
)
echo ✓ Загружено на GitHub
echo.

echo ========================================
echo   ГОТОВО!
echo ========================================
echo.
echo Vercel автоматически начнет деплой новой версии!
echo Проверьте статус на: https://vercel.com
echo.
pause

