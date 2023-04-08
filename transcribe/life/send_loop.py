import logging
from fastapi import WebSocket
import asyncio

from .worker import TranscribeWorker

log = logging.getLogger("ws-send")

async def send_loop(websocket: WebSocket, worker: TranscribeWorker):
    """

    """
    try:
        log.info("Starting sending loop")
        while True:
            message = await worker.out_queue.get()
            await websocket.send_json(message)
    except asyncio.exceptions.CancelledError:
        # well, we where canceled and that is fine
        pass
    except Exception as e:
        log.error(f"Error in websocket sending loop: {e}")
    finally:
        # worker.out_queue.task_done()
        log.info("Finished sending loop")
