# Rasa Open Source requires Python <3.11, hence the explicit 3.10 base image
# (this project's local dev also pins to Python 3.10 via the `py` launcher —
# see rasa-bot/README.md for why).
FROM python:3.10-slim

WORKDIR /app

# Native deps some of Rasa's pinned packages (e.g. tensorflow) may need at
# runtime on a slim base image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake a fresh model into the image from whatever training data is in this
# build, rather than committing a large binary model file to git.
RUN rasa train

ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf-8

# Render (and most PaaS hosts) inject $PORT at runtime — shell-form CMD so
# it's substituted when the container starts, not baked in at build time.
# Hugging Face Spaces defaults to port 7860 and may not set $PORT at all,
# hence the fallback.
CMD rasa run --enable-api --cors "*" --credentials credentials.yml --endpoints endpoints.yml --port ${PORT:-7860}
