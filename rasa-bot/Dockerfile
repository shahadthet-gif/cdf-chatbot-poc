FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
RUN rasa train 
CMD rasa run --enable-api --cors "*" --credentials credentials.yml --endpoints endpoints.yml --port ${PORT:-7860}
