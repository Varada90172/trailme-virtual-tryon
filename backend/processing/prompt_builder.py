# from __future__ import annotations


# def build_prompt(person_label: str = "Photo A", outfit_label: str = "Photo B") -> str:
#     return f"""
# You are an expert fashion designer and image manipulation specialist. Your task is to generate a photorealistic virtual try-on image.

# IMAGE INPUTS:
# - {person_label}: The person/model photo. This is the base for all preservation requirements.
# - {outfit_label}: The garment/outfit reference photo. Extract only the clothing item(s).

# CRITICAL PRESERVATION REQUIREMENTS (HIGH PRIORITY):
# 1. Preserve EVERY detail of the person in {person_label}:
#    - Face: identity, facial features, expression, skin tone
#    - Body: exact shape, posture, pose, stance, body angle
#    - Environment: background, setting, lighting conditions, shadows, color grading
#    - Hair: style, color, texture, placement
#    - Visible skin areas: arms, neck, legs, hands, proportions
#    - Original clothing that shouldn't be replaced

# GARMENT TRANSFER REQUIREMENTS (PRECISION CRITICAL):
# 2. Extract ONLY the garment from {outfit_label}:
#    - Identify the exact clothing item(s) to transfer
#    - Capture all design details: color, pattern, texture, material appearance, prints, embroidery
#    - Note all structural elements: seams, hems, buttons, zippers, pockets, collars, cuffs
#    - Preserve fabric drape and movement characteristics
#    - IGNORE: model/person in {outfit_label}, background, props, lighting of the reference garment

# 3. Intelligently map the garment onto the person:
#    - Scale and fit the garment to the person's body dimensions
#    - Align with the person's body angle and pose
#    - Apply realistic wrinkles, folds, and drape based on fabric type and body movement
#    - Account for body contours and three-dimensional fit
#    - Ensure natural transitions where garment meets skin
#    - Preserve neckline, armhole, and waistband proportions relative to the body

# 4. Physics and Material Realism:
#    - Apply proper gravity and weight to fabric
#    - Create realistic shadows and highlights on the garment
#    - Match lighting direction and intensity from the person image
#    - Blend fabric texture with surrounding elements
#    - Ensure proper color matching with the person's existing colors/tone

# OUTPUT REQUIREMENTS:
# 5. Final image must be:
#    - ONE single, unified, photorealistic image (NOT a collage, grid, or side-by-side)
#    - High quality, professional appearance
#    - No artificial borders, watermarks, or multiple panels
#    - No duplicate images or comparisons
#    - Same composition and framing as the original person photo
#    - Only the garment changed, everything else identical to {person_label}

# RESTRICTIONS:
# 6. DO NOT:
#    - Add or remove people
#    - Change the person's body shape or posture
#    - Alter the background or setting
#    - Change lighting or shadows on the person's face/body
#    - Add unrelated objects or accessories
#    - Create multiple views or panels
#    - Use any part of {outfit_label} except the garment itself
#    - Apply extreme distortions or unrealistic effects

# RETURN ONLY the generated image. No text, explanation, or metadata.
# """.strip()
from __future__ import annotations

from typing import Literal

PersonTopType = Literal[
    "unknown",       # don't know what the person is currently wearing
    "sleeveless",    # tank top / sleeveless blouse-like top already
    "short_sleeve",  # t-shirt, short sleeve top
    "full_sleeve",   # long sleeves, full arm covered
    "high_neck",     # turtleneck / high collar covering neck-chest area
    "saree_blouse",  # already wearing a blouse (any sleeve length)
]

BlouseSource = Literal[
    "reference_has_blouse",   # outfit photo shows a matching/contrast blouse to copy
    "generate_matching",      # outfit photo is fabric/saree only -> design a blouse from the saree fabric
    "keep_person_blouse",     # person is already wearing a usable blouse, don't touch it
]


def _sleeve_instruction(top_type: PersonTopType) -> str:
    """Build the instruction block that handles whatever the person is currently wearing."""
    if top_type in ("full_sleeve", "high_neck"):
        return f"""
   - The person's current top covers the arms/shoulders/neck more than a saree blouse would.
   - You MUST remove the original garment fully in those newly-exposed areas and
     REGENERATE realistic bare skin (arms, shoulders, and upper chest as needed) that
     exactly matches the person's own visible skin tone, texture, undertone, and any
     visible skin details (moles, tan lines, jewelry already on the skin) from other
     parts of the same photo (face, hands, visible neck).
   - Do NOT invent a different skin tone. Do NOT leave fabric residue, ghosting, or
     blurred edges where the old sleeve used to be.
   - Add only natural, subtle skin shading/shadow consistent with the existing lighting
     direction — no unnatural smoothness or plastic-looking skin.
"""
    if top_type == "short_sleeve":
        return f"""
   - The person's current top covers the shoulders and part of the upper arm.
   - Remove the original sleeve fabric and regenerate the exposed shoulder/upper-arm skin
     to match the person's own visible skin tone and texture exactly, blending seamlessly
     with the visible lower arm and hands already in the photo.
"""
    if top_type in ("sleeveless", "saree_blouse"):
        return """
   - The person's current top already exposes the arms/shoulders similarly to a saree
     blouse. Use the existing visible skin as ground truth — do not alter skin tone,
     but you may still need to reshape the neckline/armhole area to match the new blouse.
"""
    # unknown
    return """
   - The person's current top style is not specified in advance. First infer from the
     photo how much of the arms/shoulders/neck it covers, then expose exactly the areas
     a saree blouse would expose (shoulders, arms below the sleeve line, upper back if
     visible) by regenerating realistic skin that matches the person's own tone and
     texture wherever the original garment is removed. Never guess a skin tone that
     doesn't match the rest of the same photo.
"""


def _blouse_instruction(blouse_source: BlouseSource, saree_label: str) -> str:
    if blouse_source == "reference_has_blouse":
        return f"""
   - {saree_label} includes a blouse on its reference model — if a blouse is visible,
     extract and transfer that exact blouse design (color, sleeve length, neckline,
     embellishment) along with the saree, fitted to the person's body.
   - If the reference image only shows fabric without a distinct blouse, design a simple,
     tasteful blouse using the saree's palette and style so that the final outfit still
     matches the selected saree closely.
"""
    if blouse_source == "keep_person_blouse":
        return """
   - The person is already wearing a usable blouse in their own photo — keep that blouse
     completely unchanged. Only add the saree drape (pallu, pleats, pinning) over it.
"""
    # generate_matching
    return f"""
   - {saree_label} shows only the saree fabric/drape without a distinct blouse to copy.
   - DESIGN a simple, tasteful blouse that complements the saree: pick a coordinating or
     contrast color pulled from the saree's own palette (e.g. a border color or a neutral
     shade), a modest regular-fit sleeve (elbow-length unless the saree style implies
     otherwise), and a conventional round or sweetheart neckline typical of silk saree
     blouses. Keep it understated so the saree fabric remains the visual focus.
   - Fit this generated blouse naturally to the person's body shape and pose.
"""


def build_saree_tryon_prompt(
    person_label: str = "Photo A",
    saree_label: str = "Photo B",
    person_top_type: PersonTopType = "unknown",
    blouse_source: BlouseSource = "generate_matching",
    fabric_name: str = "silk saree",
) -> str:
    """
    Build a prompt for an AI image-editing model to generate a photorealistic
    silk-saree try-on demo for a shop, from:
      - a person photo wearing ANY kind of top (not assumed to be blouse-ready), and
      - a saree/fabric reference photo (which may or may not include a blouse).

    Handles, without needing to manually classify every possible input photo:
      * arms/shoulders hidden by t-shirts, full sleeves, high necks -> regenerated skin
      * sarees shown as fabric only -> auto-designs a matching blouse
      * sarees shown already worn with a blouse -> copies that blouse
      * person already wearing a wearable blouse -> leaves it untouched
    """
    sleeve_block = _sleeve_instruction(person_top_type)
    blouse_block = _blouse_instruction(blouse_source, saree_label)

    return f"""
You are an expert Indian fashion stylist and photorealistic image-editing specialist.
Generate a virtual try-on demo image of a {fabric_name} for an online saree shop.

IMAGE INPUTS:
- {person_label}: The customer/model photo. Base for all identity and scene preservation.
  Her current top/outfit may be anything (t-shirt, full-sleeve top, kurta, etc.) — it is
  NOT assumed to already be a saree blouse.
- {saree_label}: The saree/fabric reference. Extract only the saree (drape, color,
  pattern, border, pallu design, texture/sheen of the silk).

STEP 1 — HANDLE THE PERSON'S CURRENT CLOTHING:
{sleeve_block.strip()}

STEP 2 — BLOUSE HANDLING:
{blouse_block.strip()}

STEP 3 — PRESERVE EVERYTHING ELSE ABOUT THE PERSON AND MAKE BACKGROUND WHITE:
   - Face: identity, expression, skin tone, makeup exactly as in {person_label}.
   - Hair: style, color, texture, placement unchanged.
   - Body: exact shape, posture, pose, and camera angle unchanged.
   - Background, environment: The background of the final image MUST be solid, plain white. Adjust the lighting, shadows, and color grading of the person to fit naturally against a clean, plain white background.
   - Hands, jewelry already worn (bangles, rings), and any accessories stay untouched
     unless they physically conflict with the new saree drape.

STEP 4 — DRAPE THE SAREE REALISTICALLY:
   - Replace the person's current outfit with the exact saree from {saree_label}.
   - Map the saree pattern/border/pallu onto the body with correct pleats at the waist,
     a natural pallu fall over the shoulder, and realistic silk drape (heavier, stiffer
     fold behavior than cotton or chiffon).
   - Match lighting direction/intensity from {person_label} onto the saree fabric —
     correct highlights on the silk sheen, correct shadow falloff in the pleats.
   - Ensure natural, seamless transitions at the blouse-to-skin edge and saree-to-blouse
     edge — no visible seams, no flat "sticker-pasted" look.

OUTPUT REQUIREMENTS:
   - ONE single, unified, photorealistic image — NOT a collage, grid, or side-by-side.
   - The final image must show the person wearing the saree in a completed try-on result.
   - If the original person photo is full body, preserve the full body and show the complete saree drape.
   - Same framing/composition as {person_label}.
   - No watermarks, no extra panels, no duplicate images.
   - No text, caption, or explanation in the output — return only the image.

DO NOT:
   - Change the person's identity, face, body shape, or posture. Do NOT preserve the original background of {person_label}; instead, ensure the background is solid, plain white.
   - Include any watermarks, text, diagonal grid lines, or background details from {saree_label} (such as the "pngtree" watermarks or diagonal watermark lines).
   - Generate a separate draped fabric or standing garment next to the person. The output image must only contain the person wearing the saree on a solid white background.
   - Leave any trace (fabric edge, blur, mismatched tone) of the original garment where
     it was removed.
   - Add extra people, props, or unrelated accessories.
   - Use anything from {saree_label} other than the saree/fabric itself (ignore its
     reference model, background, and lighting).
""".strip()
def build_prompt(person_label: str = "Photo A", outfit_label: str = "Photo B") -> str:
    return build_saree_tryon_prompt(
        person_label=person_label,
        saree_label=outfit_label,
        blouse_source="reference_has_blouse",
    )


if __name__ == "__main__":
    # Example: customer photo is wearing a full-sleeve kurta, saree photo is fabric-only
    print(
        build_saree_tryon_prompt(
            person_label="Photo A",
            saree_label="Photo B",
            person_top_type="full_sleeve",
            blouse_source="generate_matching",
        )
    )