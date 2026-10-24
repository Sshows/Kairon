# Lab orchestrator

Сервис запланирован на Этап 3. Здесь пока нет исполняемого API, Docker-клиента или лабораторных образов.

Контракт: start(templateId, verifiedUserId), stop(ownedSessionId), reset(ownedSessionId), status(ownedSessionId). Идентификатор пользователя приходит из проверенной серверной сессии, templateId — из списка утверждённых шаблонов. WebSocket-шлюз получает отдельное короткоживущее разрешение для конкретной сессии. Политика изоляции и критерии приёмки: [план сервера](../../docs/lab-host-plan.md).
