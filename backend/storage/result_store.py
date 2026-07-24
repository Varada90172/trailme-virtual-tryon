from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = BASE_DIR / "storage" / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def save_result(session_id: str, image_bytes: bytes) -> str:
    output_path = OUTPUT_DIR / f"{session_id}.jpg"
    output_path.write_bytes(image_bytes)
    return str(output_path)
