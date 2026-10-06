FROM python:3.12-alpine
RUN adduser -D -u 10001 runner && mkdir -p /work && chown runner:runner /work
USER runner
WORKDIR /work
ENTRYPOINT ["python","-I","/work/main.py"]
