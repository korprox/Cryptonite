1. Создать анонимного пользователя
curl -X POST https://exampledns.kz/api/users/anonymous \
  -H "Content-Type: application/json"


🔹 Ответ (пример):

{
  "id": "144dfd91-d33d-4bd9-b2dc-6093e0da6ee6",
  "anonymous_id": "Автор #5175",
  "display_name": "Автор #5175",
  "token": "eyJhbGciOi..."
}

2. Создать чат между двумя пользователями
curl -X POST https://exampledns.kz/api/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ПОЛЬЗОВАТЕЛЯ>" \
  -d '{
    "participants": [
      "144dfd91-d33d-4bd9-b2dc-6093e0da6ee6",
      "ab50dd98-896a-4539-941f-a3b408764080"
    ]
  }'


🔹 Ответ (пример):

{
  "id": "086bf024-554e-4cda-a029-295e403f6739",
  "participants": [
    "144dfd91-d33d-4bd9-b2dc-6093e0da6ee6",
    "ab50dd98-896a-4539-941f-a3b408764080"
  ],
  "is_active": true
}

3. Создать signaling room для звонка (cryptonite дергает автоматически, но можно руками)
curl -X POST http://signaling-service:8080/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "086bf024-554e-4cda-a029-295e403f6739"
  }'


🔹 Ответ:

{
  "room_id": "086bf024-554e-4cda-a029-295e403f6739",
  "status": "created"
}

4. Подключиться к signaling по WebSocket

Обычно в мобилке будет wss://.../ws/{room_id}, а руками можно так:

websocat ws://signaling-service:8080/ws/086bf024-554e-4cda-a029-295e403f6739

И с другой стороны (другой клиент):

websocat ws://signaling-service:8080/ws/086bf024-554e-4cda-a029-295e403f6739
