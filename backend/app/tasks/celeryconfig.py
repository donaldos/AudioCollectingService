import os

from kombu import Queue

# settings 대신 os.environ 직접 사용 — worker 컨테이너에 SECRET_KEY 불필요
broker_url = os.environ.get("REDIS_URL", "redis://redis:6379/0")
result_backend = os.environ.get("REDIS_URL", "redis://redis:6379/0")
task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]
timezone = "Asia/Seoul"

task_queues = (
    Queue("audio_analysis", routing_key="audio.#"),
)
task_default_queue = "audio_analysis"

worker_concurrency = 2
task_soft_time_limit = 120   # 2분 소프트 리밋
task_time_limit = 180        # 3분 하드 리밋
