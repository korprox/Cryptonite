# notification_sender.py
import os
import json
import aio_pika
import asyncio
from dotenv import load_dotenv

load_dotenv()

RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq/")
QUEUE_NAME = os.environ.get("NOTIFY_QUEUE", "notifications")

async def send_push(user_id: str, title: str, body: str, platform: str, token: str):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.default_exchange.publish(
        aio_pika.Message(
            body=json.dumps({
                "user_id": user_id,
                "title": title,
                "body": body,
                "platform": platform,
                "token": token
            }).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        ),
        routing_key=QUEUE_NAME
    )
    await connection.close()

async def on_call_start(user_id: str, token: str):
    await send_push(user_id, "Call started", "Your call has started", "firebase", token)

async def on_chat_room_created(user_id: str, token: str):
    await send_push(user_id, "Chat room created", "A new chat room was created for you", "firebase", token)
