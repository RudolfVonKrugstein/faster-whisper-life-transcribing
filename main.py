from fastapi import FastAPI, Depends, HTTPException, Request, WebSocket
import numpy as nd
from faster_whisper.audio import decode_audio
import io
import os
from fastapi.staticfiles import StaticFiles
from transcribe import model
import logging
from decoder.pcm import PCMDecoder
from decoder.opus import OpusDecoder
from .transcribe.life.worker import TranscribeWorker

from numpy.typing import NDArray

logging.basicConfig(level=logging.DEBUG)

app = FastAPI()

root = os.path.dirname(__file__)
app.mount("/ui", StaticFiles(directory=os.path.join(root, "ui")), name="ui")


async def get_body(request: Request) -> NDArray[nd.float32]:
    """
    Helper function, getting the body of an request and return the
    included audio as a numy float32 array.
    """
    if request.query_params.get("raw", "True").lower() == "true":
        return nd.frombuffer(await request.body(), dtype=nd.float32)
    else:
        return decode_audio(
            io.BytesIO(await request.body()), sampling_rate=16000, split_stereo=False
        )


@app.post("/transcribe")
def transcribe(
    data: NDArray[nd.float32] = Depends(get_body),
    lang: str = "en",
    prompt: str | None = None,
):
    """
    Transcribe endpoint, taking the data in RAW float32 format
    and running transcribe on it.
    """
    return model.transcribe(data, lang, prompt)


@app.post("/translate")
def translate(
    data: NDArray[nd.float32] = Depends(get_body),
    lang: str = "en",
    prompt: str | None = None,
):
    """
    Transcribe endpoint, taking the data in RAW float32 format
    and running transcribe on it.
    """
    return model.translate(data, lang, prompt)


@app.websocket("/transcribe_life")
async def websocket_endpoint(
    websocket: WebSocket, mediaType="raw", lang: str = "en", prompt: str | None = None
):
    decoder = None
    if mediaType == "raw":
        decoder = PCMDecoder()
    if mediaType == "opus":
        decoder = OpusDecoder()
    if decoder is None:
        raise HTTPException(
            status_code=401, detail=f"Unsupported mediaType {mediaType}"
        )
    await websocket.accept()

    worker = TranscribeWorker(decoder, lang=lang, prompt=prompt)
    worker.start()

    send_task = asyncio.create_task(send_loop(websocket, worker))

    try:
        await recv_loop(websocket, worker)
    finally:
        send_task.cancel()
        worker.stop_request.set()
        while worker.is_alive():
            await asyncio.sleep(0.01)
        worker.join()
        logging.info("finishing life transcribing")
