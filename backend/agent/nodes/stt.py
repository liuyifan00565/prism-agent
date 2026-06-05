import os
from agent.state import AgentState

_model = None

def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        model_name = os.getenv("WHISPER_MODEL", "base")
        _model = WhisperModel(model_name, device="cpu", compute_type="int8")
    return _model

async def run(state: AgentState) -> AgentState:
    if state.get("raw_text"):
        return state

    audio_path = state.get("audio_path")
    if not audio_path or not os.path.exists(audio_path):
        state["raw_text"] = ""
        return state

    model = get_model()
    segments, _ = model.transcribe(audio_path, language="zh")
    text = "".join(seg.text for seg in segments).strip()
    state["raw_text"] = text
    state["execution_log"].append(f"[STT] {text[:60]}...")
    return state
