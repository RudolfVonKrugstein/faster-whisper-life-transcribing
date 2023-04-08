from faster_whisper import WhisperModel
from numpy.typing import NDArray

# initialize the model
# TODO: Do this with environment variables
model_size = "small"
model = WhisperModel(model_size, device="cuda", compute_type="float32")

def transcribe_or_late(data: NDArray, lang: str, prompt: str|None, task):
    """
    run the model either for translation or transcription, depending on the task parameter.
    @param data The PCM Data to send to whisper.
    @param lang The language of the speaker.
    @param prompt The initial prompt to pass to the model.
    @param task transcribe or translate.
    @return The transcription/translation result.
    """
    segments, _ = model.transcribe(data, beam_size=5, language=lang, task=task, word_timestamps=True, initial_prompt=prompt)

    result = {"words": [], "text": ""}
    for segment in segments:
        for word in segment.words:
            result["words"].append({
                "text": word.word,
                "start_time": word.start,
                "end_time": word.end,
                "probability": word.probability
                })
            result["text"] = f"{result['text']}{word.word}"
    return result

def transcribe(data: NDArray, lang: str, prompt: str|None):
    """
    Run the model in transcribe mode. The `transcription_or_translate`.
    """
    return transcribe_or_late(data, lang, prompt, "transcribe")

def translate(data: NDArray, lang: str, prompt: str|None):
    """
    Run the model in translation mode. The `transcription_or_translate`.
    """
    return transcribe_or_late(data, lang, prompt, "translate")
