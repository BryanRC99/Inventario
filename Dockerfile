FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Runtime libraries used by WeasyPrint to generate PDF reports.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libffi8 libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 \
    shared-mime-info fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /app/staticfiles /app/media /app/private_media /app/respaldos

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
