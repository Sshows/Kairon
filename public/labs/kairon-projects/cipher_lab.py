"""Игрушечный сдвиг английских A-Z. Не защита настоящих секретов."""
alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
text = "KALI"
shift = 3
result = ""
for letter in text:
    index = alphabet.index(letter)
    result += alphabet[(index + shift) % len(alphabet)]
print("Было:", text)
print("Сдвиг:", shift)
print("Стало:", result)
