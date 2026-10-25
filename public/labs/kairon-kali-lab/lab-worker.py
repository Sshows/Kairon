"""Безвредный учебный процесс. Нет сети, записи файлов и автозапуска."""
import os
import time

if __name__ == "__main__":
    print(f"Kairon lab-worker.py: PID={os.getpid()}. Остановка: Ctrl+C.", flush=True)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nУчебный процесс остановлен.", flush=True)
