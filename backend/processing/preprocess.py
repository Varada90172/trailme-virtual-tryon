from io import BytesIO
from typing import Tuple

from PIL import Image


def preprocess_image(image_bytes: bytes, content_type: str) -> Tuple[bytes, str]:
    """Normalise uploads without cropping or distorting the customer's photo.

    The previous fixed 768 x 768 resize squeezed every portrait into a square.  That
    both reduced detail and made it harder for the image model to preserve a natural
    body shape.  Keep the original aspect ratio and retain enough pixels for a clear
    portrait while limiting very large camera uploads.
    """
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    # Compress uploads to smaller, lower-quality JPEGs for faster API requests.
    max_side = 1024
    if max(image.size) > max_side:
        scale = max_side / max(image.size)
        image = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        )
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=72, optimize=True, progressive=True)
    return buffer.getvalue(), "image/jpeg"
