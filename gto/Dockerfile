# FlipUp GTO backend: C++ engine + FastAPI service.
#   docker build -t flipup-gto gto/
#   docker run -p 8000:8000 -v flipup-cache:/app/flipup_gto/data/cache flipup-gto
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY engine engine
COPY flipup_gto flipup_gto
COPY scripts scripts
# Portable build (no -march=native); set FLIPUP_AVX2=OFF for CPUs without AVX2.
ARG FLIPUP_AVX2=ON
RUN cmake -S engine -B build -DFLIPUP_NATIVE=OFF -DFLIPUP_AVX2=${FLIPUP_AVX2} \
        -DPython3_EXECUTABLE=$(which python3) \
    && cmake --build build -j --target _engine \
    && rm -rf build
# Bake the 3-way equity table into the image: computing it takes about 40s, which every cold
# start used to pay (and the app gave up on the first request meanwhile).
RUN python3 -c "from flipup_gto.preflop import tables; tables(with_tensor=True)"

# Solved preflop games are cached here; mount a volume to keep them across restarts.
VOLUME /app/flipup_gto/data/cache
EXPOSE 8000
CMD ["uvicorn", "flipup_gto.api:app", "--host", "0.0.0.0", "--port", "8000"]
