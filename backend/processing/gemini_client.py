import asyncio
import base64
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from io import BytesIO
from typing import Dict, Optional

from PIL import Image, ImageDraw

from dotenv import load_dotenv

from .preprocess import preprocess_image
from .prompt_builder import build_prompt
from ..session.store import store
from ..utils.logging_config import logger

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'), override=True)

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover
    genai = None
    types = None


class ImageGenerationError(RuntimeError):
    """A safe, user-facing explanation of an upstream image-generation failure."""


def _try_on_prompt() -> str:
    """Return a precise, non-ambiguous saree-replacement instruction.

    A phrase such as "dress them in the saree" is interpreted as an *addition*
    by image models.  When the customer already wears a saree, that produces a
    hybrid: parts of the old cream saree remain while pieces of the catalogue
    saree are overlaid.  This prompt explicitly defines the two input roles and
    makes a full clothing replacement the single required edit.
    """
    return """
Create exactly one high-quality, photorealistic virtual try-on photograph.

IDENTITY LOCK — HIGHEST PRIORITY:
The output subject MUST be the exact same customer in Image 1. Preserve her
identity 100%: face shape, facial features, skin tone, expression, hairstyle,
age appearance, body shape, pose, hands, jewellery, and proportions. Do not
beautify, restyle, replace, or generate a new person. The person/model visible
in Image 2 must NEVER be used in the final image.

CLARITY AND FRAMING:
Create a sharp, photorealistic fashion image. Keep Image 1's original camera
framing and scene unchanged whenever possible. If the customer photo is already
full length, keep the complete person and saree visible head to toe. Never trade
the customer's identity for a new full-body pose. Keep the face and saree details
crisp and in focus: no blur, pixelation, soft fabric patterns, or artefacts.

INPUT ROLES (do not swap them):
- Image 1 is the CUSTOMER. It is the only source for the person, face, hair,
  skin tone, body shape, pose, hands, jewellery, camera angle, and scene.
- Image 2 is the SAREE PRODUCT REFERENCE. It is the only source for the saree's
  colours, weave, motifs, border, pallu, and matching blouse design.

MANDATORY CLOTHING REPLACEMENT:
Completely replace EVERY visible item of the customer's current outfit with the
single saree outfit from Image 2. This is a replacement, never an overlay or a
mix of two outfits. Remove the customer's old saree, pallu, blouse, dupatta,
embroidery, and all old fabric before rendering the new outfit. Do not leave any
cream/white/old-colour fabric, old border, old pallu, or ghosted clothing edge
visible unless that exact detail is genuinely present in the Image 2 saree.

Dress the customer in the exact saree from Image 2: reproduce its main colour,
gold border placement, motifs, silk texture, sheen, and pallu. Recreate the
matching blouse shown with the product reference. Arrange authentic saree pleats
at the waist and one continuous pallu naturally across the shoulder. The fabric
must wrap around the customer's body correctly, with believable folds, occlusion
behind the arms/hands, seams, highlights, and shadows. It must look like one
complete, neatly worn saree, not pasted fabric.

PRESERVE IMAGE 1:
Only replace clothing. Keep every non-clothing pixel of the customer and scene
consistent with Image 1. Do not copy the model, body, face, skin, hair, pose,
background, props, text, or watermarks from Image 2.

QUALITY CHECK BEFORE RETURNING:
The final image contains one customer wearing one coherent saree outfit from
Image 2, with no remnants of the original outfit, no mixed fabrics, duplicate
limbs, warped hands, floating pallu, broken borders, text, watermark, collage,
or extra people. Return only the final image.
""".strip()


def _fallback_try_on_prompt() -> str:
    """A small, compatible retry request for transient provider failures.

    Gemini occasionally rejects a long, highly constrained image-edit request or
    returns a candidate with no image.  This preserves the important editing
    instruction while giving the demo a dependable second attempt.
    """
    return (
        "Create one clear, photorealistic saree try-on. Image 1 is the customer; "
        "preserve this exact person's face, skin, hair, body, pose, hands, and "
        "scene with no identity changes. Image 2 supplies fabric only: never use "
        "its model or person. Replace only the customer's clothing with the exact "
        "saree from Image 2, including blouse, border, pallu, and pleats. Do not "
        "mix the outfits. Return only one image, with no text, watermark, collage, "
        "or extra people."
    )


def _compress_generated_image(image_bytes: bytes) -> bytes:
    """Store a clear, medium-quality JPEG for fast and reliable demo delivery."""
    with Image.open(BytesIO(image_bytes)) as image:
        image = image.convert("RGB")
        image.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=88, optimize=True, progressive=True)
        return buffer.getvalue()


def _generate_placeholder_image() -> bytes:
    """Generate a simple fallback image when Gemini is unavailable."""
    size = (1280, 1280)
    bg_color = "#F7EFE6"
    frame_color = "#D4AF37"
    accent_color = "#4A0E17"
    with Image.new("RGB", size, bg_color) as image:
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle([80, 80, size[0] - 80, size[1] - 80], radius=40, fill="white", outline=frame_color, width=12)
        draw.line([(300, 700), (420, 500), (530, 610), (650, 440)], fill=accent_color, width=18)
        draw.ellipse([220, 220, 380, 380], fill=frame_color)
        try:
            from PIL import ImageFont
            font = ImageFont.truetype("arial.ttf", 48)
        except Exception:
            font = None
        text = "AI image unavailable"
        if font is not None:
            text_width, text_height = draw.textsize(text, font=font)
        else:
            text_width, text_height = draw.textsize(text)
        draw.text(
            ((size[0] - text_width) / 2, 690),
            text,
            fill=accent_color,
            font=font,
        )
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=88, optimize=True, progressive=True)
        return buffer.getvalue()


def _generate_with_rest(
    api_key: str,
    prompt: str,
    person_bytes: bytes,
    person_content_type: str,
    outfit_bytes: bytes,
    outfit_content_type: str,
) -> Dict[str, object]:
    """Generate through Gemini's stable HTTP API.

    This deliberately does not rely on the installed google-genai package.  The
    app can otherwise be left with an old SDK after an environment upgrade even
    though its Gemini API key and the image model is fully available.
    """
    aspect_ratio = _portrait_aspect_ratio(person_bytes)
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {"text": "Image 1: customer photo. Preserve the exact person, identity, pose, and body shape from this image."},
                    {
                        "inlineData": {
                            "mimeType": person_content_type,
                            "data": base64.b64encode(person_bytes).decode("ascii"),
                        }
                    },
                    {"text": "Image 2: saree reference photo. Use only the saree fabric and blouse design from this image."},
                    {
                        "inlineData": {
                            "mimeType": outfit_content_type,
                            "data": base64.b64encode(outfit_bytes).decode("ascii"),
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {
                "aspectRatio": aspect_ratio,
                "imageSize": "2K",
            },
        },
    }
    logger.debug("Gemini request payload: %s", json.dumps(payload)[:4000])
    request = Request(
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-2.5-flash-image:generateContent",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=120) as response:
            response_text = response.read().decode("utf-8")
            logger.debug("Gemini HTTP %s response: %s", response.status, response_text[:4000])
            result = json.loads(response_text)
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        logger.error("Gemini HTTPError %s response body: %s", exc.code, detail[:4000])
        raise RuntimeError(f"Gemini HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        logger.error("Gemini URLError: %s", exc.reason)
        raise RuntimeError(f"Could not reach Gemini: {exc.reason}") from exc

    usage_metadata = result.get("usageMetadata", {})
    usage = {
        "input_tokens": usage_metadata.get("promptTokenCount", 0),
        "output_tokens": usage_metadata.get("candidatesTokenCount", 0),
        "total_tokens": usage_metadata.get("totalTokenCount", 0),
    }
    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline_data = part.get("inlineData") or part.get("inline_data")
            if inline_data and inline_data.get("data"):
                return {"image_bytes": base64.b64decode(inline_data["data"]), "usage": usage}
    finish_reasons = [
        str(candidate.get("finishReason", "unknown"))
        for candidate in result.get("candidates", [])
    ]
    raise RuntimeError(
        "Gemini returned no image data"
        + (f" (finish reasons: {', '.join(finish_reasons)})" if finish_reasons else "")
    )


def _portrait_aspect_ratio(image_bytes: bytes) -> str:
    """Choose the closest supported portrait ratio, preserving the source framing."""
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            ratio = image.width / image.height
    except Exception:
        return "2:3"

    supported = {"9:16": 9 / 16, "2:3": 2 / 3, "3:4": 3 / 4, "4:5": 4 / 5, "1:1": 1}
    return min(supported, key=lambda name: abs(supported[name] - ratio))


def _friendly_provider_error(exc: Exception) -> str:
    message = str(exc).lower()
    if "api key" in message or "unauthenticated" in message or "permission denied" in message:
        return "Image generation is not configured correctly. Please check the Gemini API key and its permissions."
    if "quota" in message or "resource exhausted" in message or "429" in message:
        return "The image-generation quota is busy or exhausted. Please wait a minute and try again."
    if "not found" in message or "404" in message or "model" in message and "not" in message:
        return "No supported Gemini image model is available for this API key. Please enable an image-generation model."
    if "safety" in message or "blocked" in message:
        return "Gemini could not generate this image because the request was blocked by its safety checks. Try a clear, well-lit, front-facing photo."
    if "gemini http 400" in message:
        return "Could not generate the saree try-on. Please retry with a clear full-body photo."
    if "gemini http 5" in message or "could not reach gemini" in message or "timed out" in message:
        return "Could not generate the saree try-on right now. Please try again in a moment."
    return "Could not generate the saree try-on. Please retry with a clear full-body photo."


def _generate_placeholder_image() -> bytes:
    """Create a simple fallback image when Gemini is unavailable."""
    size = (1280, 1280)
    bg_color = "#F7EFE6"
    frame_color = "#D4AF37"
    accent_color = "#4A0E17"
    with Image.new("RGB", size, bg_color) as image:
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle([80, 80, size[0] - 80, size[1] - 80], radius=40, fill="white", outline=frame_color, width=12)
        draw.line([(300, 700), (420, 500), (530, 610), (650, 440)], fill=accent_color, width=18)
        draw.ellipse([220, 220, 380, 380], fill=frame_color)
        try:
            from PIL import ImageFont
            font = ImageFont.truetype("arial.ttf", 48)
        except Exception:
            font = None
        text = "AI image unavailable"
        if font is not None:
            text_width, text_height = draw.textsize(text, font=font)
        else:
            text_width, text_height = draw.textsize(text)
        draw.text(
            ((size[0] - text_width) / 2, 690),
            text,
            fill=accent_color,
            font=font,
        )
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=88, optimize=True, progressive=True)
        return buffer.getvalue()


def _can_retry(exc: Exception) -> bool:
    """Avoid retrying known permanent failures such as a bad API key or quota."""
    message = str(exc).lower()
    permanent_markers = (
        "api key", "unauthenticated", "permission denied", "quota",
        "resource exhausted", "429", "safety", "blocked",
    )
    return not any(marker in message for marker in permanent_markers)


async def generate_try_on(person_bytes: bytes, person_content_type: str, outfit_bytes: bytes, outfit_content_type: str, session_id: Optional[str] = None) -> Dict[str, object]:
    api_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    
    if not api_key:
        logger.warning("No Gemini API key configured for session %s; returning fallback output", session_id)
        fallback_bytes = _generate_placeholder_image()
        return {"image_bytes": fallback_bytes, "usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}}
    
    logger.info("generate_try_on called for session %s. Generating with Gemini AI", session_id)
    prompts = (("primary", build_prompt()), ("fallback", _fallback_try_on_prompt()))
    last_error: Optional[Exception] = None
    result: Optional[Dict[str, object]] = None

    for attempt_name, prompt in prompts:
        try:
            result = await asyncio.to_thread(
                _generate_with_rest,
                api_key,
                prompt,
                person_bytes,
                person_content_type,
                outfit_bytes,
                outfit_content_type,
            )
            if attempt_name == "fallback":
                logger.warning("Gemini fallback request succeeded for session %s", session_id)
            break
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Gemini %s attempt failed for session %s: %s",
                attempt_name,
                session_id,
                exc,
            )
            if not _can_retry(exc):
                break
            # A short pause prevents an immediate repeat from being rejected by
            # an upstream service that has just closed or rate-limited a request.
            if attempt_name == "primary":
                await asyncio.sleep(1)

    if result is None:
        assert last_error is not None
        logger.exception("Gemini image generation failed for session %s", session_id, exc_info=last_error)
        fallback_bytes = _generate_placeholder_image()
        return {"image_bytes": fallback_bytes, "usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}}

    usage = result["usage"]
    result["image_bytes"] = _compress_generated_image(result["image_bytes"])
    if session_id:
        store.record_usage(session_id, usage)
    logger.info("Gemini generation completed for session %s with usage %s", session_id, usage)
    return result


def _extract_usage(response) -> Dict[str, int]:
    metadata = getattr(response, "usage_metadata", None)
    if not metadata:
        return {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

    return {
        "input_tokens": getattr(metadata, "prompt_token_count", 0) or getattr(metadata, "input_tokens", 0) or 0,
        "output_tokens": getattr(metadata, "candidates_token_count", 0) or getattr(metadata, "output_tokens", 0) or 0,
        "total_tokens": getattr(metadata, "total_token_count", 0) or getattr(metadata, "total_tokens", 0) or 0,
    }

