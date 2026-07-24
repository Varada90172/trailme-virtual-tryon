import json
from google.genai import types
from google.genai import _transformers as t

params = types._GenerateContentParameters(
    model='gemini-2.5-flash-image',
    contents=t.t_contents('A photorealistic red apple on a table.'),
    config=types.GenerateContentConfig(
        response_modalities=['IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio='2:3',
            image_size='2K',
        ),
    ),
)
print(json.dumps(params.model_dump(mode='json'), indent=2))
