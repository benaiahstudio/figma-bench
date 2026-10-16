"""Optional CLIP image similarity between a reference screenshot and a render.

Usage: python scripts/clip_score.py REFERENCE.png RENDER.png
Prints one JSON line: {"clipCosine": <float>, "model": "..."}.

First use downloads the ViT-B/32 weights (about 350 MB) from the internet and caches them.
Install the packages first: pip install -r scripts/requirements-clip.txt
"""
import json
import sys

import open_clip
import torch
from PIL import Image

MODEL = "ViT-B-32"
PRETRAINED = "openai"


def embed(model, preprocess, path):
    image = preprocess(Image.open(path).convert("RGB")).unsqueeze(0)
    with torch.no_grad():
        features = model.encode_image(image)
    return features / features.norm(dim=-1, keepdim=True)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    model, _, preprocess = open_clip.create_model_and_transforms(MODEL, pretrained=PRETRAINED, device="cpu")
    model.eval()
    reference = embed(model, preprocess, sys.argv[1])
    candidate = embed(model, preprocess, sys.argv[2])
    cosine = float((reference * candidate).sum())
    print(json.dumps({"clipCosine": cosine, "model": f"{MODEL}/{PRETRAINED}"}))


if __name__ == "__main__":
    main()
