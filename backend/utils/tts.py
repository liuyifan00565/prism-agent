import pyttsx3


def speak(text: str) -> None:
    try:
        engine = pyttsx3.init()
        engine.setProperty("rate", 180)
        engine.say(text)
        engine.runAndWait()
    except Exception:
        pass
