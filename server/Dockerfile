# Imagen para hostear el servidor (Render, Fly, una VM...). JDK 21: el Security Manager
# que aísla el código del alumno se eliminó en JDK 24, no subir la versión.
FROM eclipse-temurin:21-jdk
RUN apt-get update && apt-get install -y --no-install-recommends nodejs && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 10001 runner
WORKDIR /app
COPY index.mjs package.json ./
USER runner
ENV JAVA_RUNNER=local HOST=0.0.0.0 PORT=8787
EXPOSE 8787
CMD ["node", "index.mjs"]
