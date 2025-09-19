import os
import json
import logging
import asyncio
import aio_pika
import firebase_admin
from firebase_admin import credentials, messaging
from dotenv import load_dotenv

load_dotenv()

# RabbitMQ
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq/")
QUEUE_NAME = os.environ.get("NOTIFY_QUEUE", "notifications")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("notification-worker")

# --- Firebase setup ---
firebase_cred_json = {
  "type": "service_account",
  "project_id": "notification-service-1793b",
  "private_key_id": "e5b07a4c3aeb77581c789f6d4389a4ca3fb1084b",
  "private_key": """-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC0g+A+rJwvHGmQ
...ТВОЙ_КЛЮЧ...
-----END PRIVATE KEY-----""",
  "client_email": "firebase-adminsdk-fbsvc@notification-service-1793b.iam.gserviceaccount.com",
  "client_id": "112349409706272731676",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40notification-service-1793b.iam.gserviceaccount.com"
}

cred = credentials.Certificate(firebase_cred_json)
firebase_admin.initialize_app(cred)

# --- Worker ---
async def handle_message(message: aio_pika.IncomingMessage):
    async with message.process():
        data = json.loads(message.body)
        platform = data.get("platform")
        token = data.get("token")
        title = data.get("title")
        body = data.get("body")
        user_id = data.get("user_id")

        if platform == "firebase":
            try:
                msg = messaging.Message(
                    notification=messaging.Notification(title=title, body=body),
                    token=token
                )
                # асинхронный вызов синхронного Firebase SDK
                resp = await asyncio.to_thread(messaging.send, msg)
                logger.info(f"Sent Firebase push to {user_id}, response={resp}")
            except Exception as e:
                logger.error(f"Firebase push error: {e}")
        else:
            logger.info(f"Push to {user_id} [{platform}] {title} - {body} -> token={token}")

async def main():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=1)  # чтобы воркер брал по одному сообщению
    queue = await channel.declare_queue(QUEUE_NAME, durable=True)

    logger.info("Worker started, waiting for messages...")
    await queue.consume(handle_message)

    return connection

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    conn = loop.run_until_complete(main())
    try:
        loop.run_forever()
    finally:
        loop.run_until_complete(conn.close())
