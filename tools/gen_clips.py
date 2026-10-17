"""Generates the demo's fixed Chirp clips into web/public/noa and web/public/sim. Run: python tools/gen_clips.py"""
import base64
import json
import pathlib
import shutil
import subprocess
import urllib.request

URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
PROJECT = "no-one-alone-511616"
WEB = pathlib.Path(__file__).resolve().parent.parent / "web" / "public"

MARGARET = "en-AU-Chirp3-HD-Gacrux"
NOA = "en-AU-Chirp3-HD-Aoede"
OPERATOR = "en-AU-Chirp3-HD-Charon"

# (file under web/public, voice, speaking rate, text)
CLIPS = [
    ("noa/calling-james.mp3", NOA, 0.9, "I'm calling James now. Please stay sitting."),
    ("noa/no-answer-james-calling-david.mp3", NOA, 0.9, "James didn't answer, so I've left him a message. I'm calling David now."),
    ("noa/on-the-way-david.mp3", NOA, 0.9, "David is on his way. He has a key. I'm calling 000 now."),
    ("noa/ambulance-coming.mp3", NOA, 0.9, "Help is on the way, Margaret. The ambulance is 12 minutes away. Stay sitting. I'm right here with you."),
    ("noa/000-1.mp3", OPERATOR, 1.0, "Emergency. Police, Fire or Ambulance?"),
    ("noa/000-2.mp3", NOA, 0.9, "Ambulance. This is Noa from No One Alone, calling for Margaret Collins, 78, female, who lives alone. Possible stroke."),
    ("noa/000-3.mp3", OPERATOR, 1.0, "What's the address?"),
    ("noa/000-4-david.mp3", NOA, 0.9, "186 Marrickville Road, Marrickville 2204. Her brother David is on his way with a key."),
    ("noa/000-4-alone.mp3", NOA, 0.9, "186 Marrickville Road, Marrickville 2204. Nobody is with her. Key lockbox by the front door."),
    ("noa/000-5.mp3", OPERATOR, 1.0, "Tell me exactly what happened."),
    ("noa/000-6.mp3", NOA, 0.9, "Slurred speech at 01:40, last seen well at 01:30. She is awake and breathing, but confused. Heart rate 137. Not on blood thinners. Allergic to penicillin."),
    ("noa/000-7.mp3", OPERATOR, 1.0, "An ambulance is on its way, about 12 minutes. Don't give her anything to eat or drink."),
    ("noa/000-8.mp3", NOA, 0.9, "Thank you. Her details are going to Camperdown Stroke Centre, and I'm staying with her."),
    ("sim/red-0.mp3", MARGARET, 0.6, "Mmm... yeahh... yes..."),
    ("sim/red-1.mp3", MARGARET, 0.55, "Thhuh... shgaah... ishh... bwuuh... nnn... Zhiddd... nehh..."),
]


def token() -> str:
    gcloud = shutil.which("gcloud") or "gcloud"
    return subprocess.run([gcloud, "auth", "print-access-token"], capture_output=True, text=True, check=True).stdout.strip()


def synthesize(bearer: str, voice: str, rate: float, text: str) -> bytes:
    body = {
        "input": {"text": text},
        "voice": {"languageCode": "en-AU", "name": voice},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": rate},
    }
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), method="POST", headers={
        "Authorization": f"Bearer {bearer}", "x-goog-user-project": PROJECT, "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req) as r:
        return base64.b64decode(json.load(r)["audioContent"])


def main() -> None:
    bearer = token()
    for path, voice, rate, text in CLIPS:
        out = WEB / path
        out.write_bytes(synthesize(bearer, voice, rate, text))
        print(f"{path} {out.stat().st_size} B")


if __name__ == "__main__":
    main()
