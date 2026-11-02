# SBP Information — бесплатный Web Push / тегін Web Push

## RU

Схема: **Firebase Spark (Firestore + Authentication) → Cloudflare Worker (бесплатный) + D1 → Web Push → Android PWA**. Cloud Functions, платный тариф Firebase и изменение Firestore Rules не требуются.

Worker регистрирует устройства только по проверенному Firebase ID Token, отправляет объявления всем подписанным устройствам (кроме автора), а ответы поддержки — только конкретному автору обращения. Сотрудники получают новые обращения только при наличии действующего права `support`. Тексты личных сообщений в push не передаются. Дубли блокируются базой D1.

### Первое развёртывание (только владелец проекта)

1. Создать **бесплатный Cloudflare Workers** аккаунт и включить домен `*.workers.dev`. Платный план не подключать.
2. В Cloudflare создать API token с минимальными правами на **Workers Scripts: Edit**, **D1: Edit** (и необходимое чтение учётной записи). Получить Cloudflare **Account ID**. Никогда не передавать API token в переписке или коммитах.
3. Создать в Google Cloud / Firebase **отдельный сервисный аккаунт с доступом только на чтение Firestore**, экспортировать JSON-ключ в безопасное хранилище. Не добавлять его в репозиторий и не передавать в чат. Аккаунт должен иметь `project_id = sbpgroup-toe-26-9-1`.
4. В GitHub репозитории `sbp-information/sbp-information.github.io` открыть **Settings → Secrets and variables → Actions → New repository secret**. Добавить `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON` (вставить полный JSON ключа). Только владелец с доступом к настройкам репозитория должен делать этот шаг.
5. Перейти в **Actions → Deploy free Cloudflare Web Push (Firebase Spark) → Run workflow** (`main`). Сценарий автоматически установит зависимости, проверит тесты, создаст или переиспользует D1, применит миграции, развернёт Worker и **один раз создаст VAPID-ключи**. При повторном запуске ключи сохраняются, чтобы телефоны не теряли подписку.
6. Найти URL вида `https://sbp-information-push.<your-subdomain>.workers.dev` в логе или Cloudflare dashboard. Проверить `/health` — ответ `"configured":true`. **Это ещё не подтверждает доставку**; нужны проверка доступа к Firestore и тест на телефоне.
7. Установить URL в корневом `push-worker-config.js` (переменная `PUSH_WORKER_URL`), опубликовать, обновить PWA. На Android в меню настроек выбрать **Уведомления → Разрешить уведомления**, затем проверить отправку объявления и личного ответа, включая закрытое приложение.
8. Если сайт уже использовал другой VAPID-ключ, перед регистрацией нужно удалить старую подписку на устройстве и подписаться снова. Не менять ключи при обычном обновлении Worker.

**Важно:** Push через сторонний сервис не гарантирует доставку в реальном времени. Быстрая отправка объявлений и ответов поддержки вызывается после сохранения в Firestore; резервная проверка этих событий — каждые 2 минуты. Напоминания о занятиях проверяются каждую минуту по часовому поясу Казахстана (Asia/Almaty), включая изменения времени, отмены и паузы расписания. При превышении бесплатных лимитов Cloudflare/D1 или Firestore доставка может временно прекратиться (автоматических платных расходов на Free-плане нет). Для личных сообщений тексты не передаются в системные уведомления.

### Что меняется на сайте

Только система push-уведомлений, версия PWA-кэша и подготовленный конфиг. Настоящее расписание, журнал, преподаватели, Firestore Rules и другие функции не меняются.

## KZ

Құрылымы: **Firebase Spark (Firestore + Authentication) → тегін Cloudflare Worker + D1 → Web Push → Android PWA**. Ақылы Cloud Functions қажет емес.

Worker құрылғыларды тек тексерілген Firebase пайдаланушысы үшін тіркейді. Жаңа хабарландырулар жазылған құрылғыларға жіберіледі; қолдау қызметінің жеке жауаптары тек тиісті пайдаланушыға жетеді. Жеке хат мәтіні push хабарламасына қосылмайды. Хабарламаларды қайталау D1 арқылы тоқтатылады.

Сабақ туралы хабарландырулар Қазақстан уақытымен күнделікті 07:30-да бірінші сабаққа, ал одан кейінгі сабақтарға келесі сабақтың қоңырауына бір минут қалғанда жіберіледі. Нақты кесте, өзгертілген қоңырау уақыты, сабақтың болмауы және демалыс ескеріледі. Журнал немесе сайт жаңартулары туралы push хабарламалары жіберілмейді. Cloudflare жоспарлы іске қосуды кешіктіруі мүмкін.

Іске қосу үшін Cloudflare Free аккаунты, шектеулі Cloudflare API token, Firestore-ды тек оқи алатын жеке сервис аккаунты және GitHub Actions құпиялары қажет. Жеке кілттерді GitHub файлдарына немесе чатқа жібермеңіз. Іске қосылғаннан кейін Worker URL мекенжайы `push-worker-config.js` файлына жазылады. Android құрылғысында хабарландыруға рұқсат беріп, қолданба жабық кезде тексеру керек.

Қосымшадағы сабақ кестесі, журнал, оқытушылар және Firebase ережелері өзгермейді.


### Delivery recovery (19.37)
- Interactive dispatch retries transient failures twice (after 0.5 and 1.5 seconds), refreshes an expired Firebase token, and bounds each HTTP request to 12 seconds. The two-minute scheduled poll remains a fallback.
- Push requests use high urgency. This requests immediate delivery but does not guarantee an OS notification deadline.
- Migration 0002 preserves existing receipts as sent. New pending receipts have a 30-second lease, so an interrupted attempt can recover. Successful recipients are skipped on retries; ambiguous provider timeouts can still redeliver with the same notification tag.
- Lesson reminders retry for five minutes after their scheduled minute, always before lesson start. Their provider TTL is at most five minutes and their payload expires at lesson start. No past lessons are replayed.
- Tests exercise actual Web Push encryption and SQLite reservation SQL with mocked provider responses. They do not establish real Android/iOS delivery; verify the first support reply after idle and the next scheduled lesson on a subscribed phone.


### Reliable reminders and background health (19.55)
- RU: Напоминание о следующей паре привязано к её началу, а не к концу предыдущей пары. Задержанные запуски Cron догоняются до первой пары и в течение пяти минут после следующего звонка; сообщения не повторяются после успешной отправки. Ошибки расписания отмечаются в Cron и в `GET /health` (`cronHealthy`, `remindersReady`). Приложение предупреждает, если сервер напоминаний недоступен, даже при разрешённых уведомлениях.
- RU: При устаревшем VAPID-ключе устройство переподписывается, а Push нескольким телефонам отправляются группами до четырёх параллельных запросов. Число запросов к Push-провайдерам ограничено, чтобы соблюдать бесплатные лимиты Cloudflare. Ключи при штатном обновлении не меняются.
- KZ: Келесі сабақ туралы еске салғыш алдыңғы сабақ біткен кезде емес, келесі сабақ басталардан бір минут бұрын жіберіледі. Кешіккен Cron тексерулері сабақ басталғанша немесе басталғаннан кейінгі бес минут ішінде қайталанады. `/health` фондық жоспарлағыштың жұмысын бақылайды, ал қолданба ақау болса ескертеді.
- KZ: Ескірген VAPID жазылымы жаңартылады, хабарландырулар бір уақытта төрт құрылғыға дейін жіберіледі; Cloudflare Free шектеулері ескеріледі.
