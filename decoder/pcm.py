import numpy as nd
import logging

log = logging.getLogger("pcm-decoding")

class PCMDecoder:
    """Class for decoding int16 pcm data to float32 stored in a numpy array."""
    def __init__(self):
        pass

    def decode(self, data_bytes:bytes):
        try:
            if len(data_bytes) > 0:
                return nd.frombuffer(data_bytes, dtype=nd.int16).astype(nd.float32)/32768.0
            else:
                return nd.empty(shape=(0), dtype=nd.float32)
        except Exception as e:
            log.error(f"Error during decoding: {e}")
            raise e
