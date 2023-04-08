from decoder.pcm import PCMDecoder
import pyogg
import logging
import traceback

log = logging.getLogger("ogg-decoding")

class OpusDecoder:
    """
    Decode opus data to pcm float32 stored in numpy array.
    """
    def __init__(self):
        self.opus_decoder = pyogg.OpusDecoder()
        self.opus_decoder.set_channels(1)
        self.opus_decoder.set_sampling_frequency(16000)
        # we base this on the pcm decoder :)
        self.pcm_decoder = PCMDecoder()

    def decode(self, data_bytes):
        try:
            writable_data = bytearray(len(data_bytes))
            writable_data[:] = data_bytes
            decoded_pcm = self.opus_decoder.decode(writable_data)
        except Exception as e:
            log.error(f"Error during decoding: {e}");
            traceback.print_exception(e);
            raise e
        return self.pcm_decoder.decode(decoded_pcm)
