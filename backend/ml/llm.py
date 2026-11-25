"""Обращение к локальной модели через Ollama (OpenAI-совместимый API).

Отдельный пакет openai не нужен: POST /v1/chat/completions с tools отправляется через requests.
Общий модуль для сводки по проекту и для чата AI-помощника.
"""
import os

import requests

DEFAULT_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
DEFAULT_MODEL = os.environ.get("TASKCONTROL_AI_MODEL", "qwen2.5:3b")


class AgentUnavailable(Exception):
    """Модель недоступна: Ollama не запущен, модель не скачана или ответ не пришёл вовремя."""


def ollama_chat(base_url, model, messages, tools=None, timeout=120):
    """Один ответ модели: сообщение ассистента, возможно с вызовами инструментов."""
    # temperature 0: the same facts give the same, sober wording, without invented details.
    payload = {"model": model, "messages": messages, "stream": False, "temperature": 0}
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
    try:
        response = requests.post(f"{base_url.rstrip('/')}/chat/completions", json=payload, timeout=timeout)
    except requests.Timeout as error:
        raise AgentUnavailable("Модель отвечает слишком долго. Попробуйте ещё раз.") from error
    except requests.RequestException as error:
        raise AgentUnavailable("Ollama не запущен: модель недоступна.") from error
    if response.status_code == 404:
        raise AgentUnavailable(f"Модель {model} не найдена в Ollama. Скачайте её: ollama pull {model}")
    if not response.ok:
        raise AgentUnavailable(f"Ollama вернул ошибку HTTP {response.status_code}.")
    return response.json()["choices"][0]["message"]
