import logging
from fastapi import WebSocket, WebSocketDisconnect

from .worker import TranscribeWorker

log = logging.getLogger("ws-recv")

async def recv_loop(websocket: WebSocket, worker: TranscribeWorker):
    """
    Loop pulling the out queue of the worker for data and sending it via the web socket.
    This is for synchronizing the thread `worker` with the async event loop of the
    fastapi web socket interface.
    """
    try:
        log.info("Starting receiving loop")
        while True:
            data_bytes = await websocket.receive_bytes()
            await worker.in_queue.put(data_bytes)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        log.error(f"Error in web socket receiving loop: {e}")
    finally:
        log.info("finished receiving loop")
