"""Показывает обратимое кодирование без пароля."""
import base64

text = "Учебная записка"
encoded = base64.b64encode(text.encode("utf-8")).decode("ascii")
decoded = base64.b64decode(encoded, validate=True).decode("utf-8")
print("Записано в Base64:", encoded)
print("Вернули:", decoded)
print("Пароль понадобился: нет")
