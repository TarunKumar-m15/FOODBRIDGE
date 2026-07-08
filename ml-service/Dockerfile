FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Run training on container startup if model doesn't exist, then start Flask app
CMD python train.py && python app.py
