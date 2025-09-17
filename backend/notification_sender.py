import os
import json
import asyncio
import aio_pika
from dotenv import load_dotenv

load_dotenv()

RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq/")
QUEUE_NAME = os.environ.get("NOTIFY_QUEUE", "notifications")


async def send_push(user_id: str, title: str, body: str, platform: str, token: str):
    """
    Отправляет пуш в очередь RabbitMQ
    """
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.declare_queue(QUEUE_NAME, durable=True)

    message = {
        "user_id": user_id,
        "title": title,
        "body": body,
        "platform": platform,
        "token": token
    }

    await channel.default_exchange.publish(
        aio_pika.Message(
            body=json.dumps(message).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        ),
        routing_key=QUEUE_NAME
    )
    await connection.close()
    print(f"Push queued: {message}")


# ---------------- Example usage ----------------

async def on_call_start(caller_id: str, receiver_id: str, token: str):
    title = "Incoming Call"
    body = f"User {caller_id} is calling you"
    await send_push(receiver_id, title, body, platform="firebase", token=token)


async def on_chat_room_created(chat_id: str, user_ids: list, token_map: dict):
    title = "New Chat Room"
    body = f"You have been added to chat {chat_id}"
    tasks = []
    for uid in user_ids:
        tasks.append(send_push(uid, title, body, platform="firebase", token=token_map[uid]))
    await asyncio.gather(*tasks)


# Пример для локального теста
if __name__ == "__main__":
    test_token = "DEVICE_FCM_TOKEN"
    asyncio.run(on_call_start("user123", "user456", test_token))
    asyncio.run(on_chat_room_created("chat789", ["user123", "user456"], {"user123": test_token, "user456": test_token}))
