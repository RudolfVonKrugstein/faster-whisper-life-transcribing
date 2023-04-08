"""
This module defines the worker thread, that continuously runs the whisper model on the data received so far.
"""

import threading
import asyncio
import numpy as nd
from .. import model
import logging

log = logging.getLogger("life-trans-worker")

class TranscribeWorker(threading.Thread):
    """
    Worker thread, receiving data through `self.in_queue`, running the
    whisper model, sending the result to self.out_queue and continuing from the start.
    """
    def __init__(self, decoder, lang: str, prompt: str|None):
        super(TranscribeWorker, self).__init__()
        # synchronisation
        self.in_queue = asyncio.Queue()        # incoming audio data
        self.out_queue = asyncio.Queue()       # outgoing transcriptions
        self.stop_request = threading.Event()  # signal when we should stop
        # parameters for the run
        self.lang = lang                       # the spoken language
        self.prompt = prompt                   # the initial prompt
        self.decoder = decoder                 # the audio data decoder

    def run(self):
        # buffer array, 30 seconds of audio
        buffer = nd.empty(shape=16000 * 30,dtype=nd.float32)
        # current size
        buffer_size = 0
        data_bytes: bytes = bytes()

        try:
            while not self.stop_request.isSet(): # we stop when we are told to by this event
                # get all available bytes until there is not data to be received
                while True:
                    try:
                        data_bytes = self.in_queue.get_nowait();
                        tmp = self.decoder.decode(data_bytes);
                        if len(tmp) > 0:
                            buffer[buffer_size:buffer_size+len(tmp)] = tmp
                            buffer_size += len(tmp)
                    except asyncio.QueueEmpty:
                        # all data read
                        break
                # do a prediction!
                if buffer_size > 1000:
                    result = {
                            "finished": "",
                            "unfinished": model.transcribe(buffer[0:buffer_size], self.lang, self.prompt)
                            }
                    asyncio.run(self.out_queue.put(result))
        except Exception as e:
            log.error(f"Error during transcribing: {e}")
        finally:
            log.info("done with transcribing worker")
