## Перед началом: Криптографические задачи из `pwncollege/acsac-ctf-dojo` и `ctf-archive`: взлом `LCG PRNG` и оракул дополнения `AES-CBC Padding Oracle`

В репозиториях **`pwn.college` (`github.com/pwncollege/acsac-ctf-dojo` и `github.com/pwncollege/ctf-archive`)** криптографические задачи учат главному правилу прикладной криптографии: **даже стойкий шифр или генератор ломается мгновенно, если разработчик использовал некриптографический `PRNG` или раскрыл побочный канал проверки дополнения (`Padding Oracle`)**.

Разберём обе классические атаки из архивов CTF:
1. **Предсказание линейного конгруэнтного генератора (`LCG — Linear Congruential Generator`)**:
   Обычные генераторы псевдослучайных чисел (`rand()` в C, `java.util.Random`) работают по простой рекуррентной формуле:
   $$X_{n+1} = (a \cdot X_n + c) \bmod m$$
   Почему такой генератор категорически нельзя использовать для создания токенов сброса пароля или ключей сессии?
   Потому что в нём нет никакой криптографической тайны! Если известны параметры $(a, c, m)$ и атакующий увидел всего **одно** сгенерированное число $X_n$ (например, в своём собственном токене), он одним умножением вычисляет **все будущие числа** $X_{n+1}, X_{n+2}, \dots$ и даже восстанавливает предыдущие состояния через обратный элемент $a^{-1} \bmod m$ (`pow(a, -1, m)`)!
   **Защита**: использовать только криптостойкий генератор операционной системы (`secrets.token_hex()`, `os.urandom()`, `/dev/urandom`).
2. **Атака через оракул дополнения в режиме `AES-CBC` (`CBC Padding Oracle Attack — Vaudenay`)**:
   В режиме сцепления блоков `CBC` при расшифровке каждого блока шифротекста $C_i$ сначала применяется блочный шифр $D_K(C_i)$, а затем результат складывается по модулю 2 (`XOR`) с **предыдущим блоком шифротекста** $C_{i-1}$ (или вектором инициализации `IV`):
   $$P_i = D_K(C_i) \oplus C_{i-1}$$
   Чтобы длина открытого текста была кратна 16 байтам, в конец добавляется дополнение по стандарту **`PKCS#7`**: если не хватает 1 байта, дописывается `\x01`; если 2 байт — `\x02\x02`; если 3 байт — `\x03\x03\x03`.
   В чём заключается фатальная ошибка сервера («Padding Oracle»)?
   Если сервер при получении зашифрованной куки расшифровывает её и возвращает **разные ответы**:
   - `500 Invalid Padding` (когда последние байты не образуют валидный `PKCS#7`);
   - `200 OK / 403 Invalid User` (когда `PKCS#7` сошёлся правильно!),
   то атакующий вообще **без знания ключа `K`** перебирает последний байт `IV'` от `0` до `255` (максимум 256 запросов), находит такое значение `g`, при котором сервер отвечает «Padding OK» (значит, $D_K(C_1)[-1] \oplus g = 0x01$), и мгновенно вычисляет секретный байт промежуточного состояния:
   $$D_K(C_1)[-1] = g \oplus 0x01 \implies P_1[-1] = D_K(C_1)[-1] \oplus \text{IV}[-1]$$

## Почему это работает: Режим `AES-GCM` или схема `Encrypt-then-MAC` проверяют подпись до расшифровки

Если шифротекст защищён тегом аутентификации (`AES-GCM` или `HMAC-SHA256` поверх `IV || Ciphertext`), сервер **сначала проверяет подпись**, и при изменении хотя бы одного бита в `IV` сразу отвергает пакет с единой ошибкой `MAC Verification Failed`, вообще не запуская расшифровку и не проверяя `PKCS#7`!

<!-- preparation -->

В этом практикуме ты реализуешь в `lab.py` оба алгоритма из `pwncollege/acsac-ctf-dojo` и `ctf-archive`:
1. Обращение и предсказание генератора `LCG` (`next_state` и `prev_state` через `pow(a, -1, m)`).
2. Побайтовое восстановление секретного текста через `CBC Padding Oracle` без знания ключа шифрования, а также защиту через `Encrypt-then-MAC`.

## Сделай сейчас: Взломай `LCG` и восстанови секретный байт через `CBC Padding Oracle` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import hmac
import hashlib

LCG_A = 1103515245
LCG_C = 12345
LCG_M = 1 << 31


def lcg_next(state):
    return (LCG_A * state + LCG_C) % LCG_M


def lcg_prev(next_state):
    # Восстановление предыдущего состояния через модульную инверсию pow(LCG_A, -1, LCG_M)
    inv_a = pow(LCG_A, -1, LCG_M)
    return ((next_state - LCG_C) * inv_a) % LCG_M


# Моделируем последний байт блока CBC: P[-1] = D_K(C)[-1] ^ IV[-1]
SECRET_DK_LAST_BYTE = 0x94  # Неизвестный атакующему выход блочного шифра D_K(C)[-1]


def cbc_padding_oracle_last_byte(modified_iv_last_byte):
    # Сервер проверяет только то, равен ли последний байт расшифрованного текста 0x01 (валидный PKCS#7 длины 1)
    decrypted_pad_byte = SECRET_DK_LAST_BYTE ^ modified_iv_last_byte
    return decrypted_pad_byte == 0x01


def recover_plaintext_last_byte(orig_iv_last_byte):
    for guess in range(256):
        if cbc_padding_oracle_last_byte(guess):
            intermediate_dk_byte = guess ^ 0x01
            recovered_char_code = intermediate_dk_byte ^ orig_iv_last_byte
            return chr(recovered_char_code), guess
    return None, -1


def verify_encrypt_then_mac(iv_bytes, cipher_bytes, mac_key, provided_tag):
    expected_tag = hmac.new(mac_key, iv_bytes + cipher_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_tag, provided_tag):
        return "REJECTED_BEFORE_DECRYPT:mac_mismatch_padding_oracle_impossible"
    return "MAC_OK:proceed_to_decrypt"


s0 = 424242
s1 = lcg_next(s0)
print("lcg_predicted_next=", lcg_next(s1), "lcg_recovered_s0=", lcg_prev(s1) == s0)

# Пусть настоящий последний символ открытого текста P[-1] был 'Z' (0x5a), тогда orig_iv = 0x94 ^ 0x5a = 0xce
orig_iv_byte = SECRET_DK_LAST_BYTE ^ ord("Z")
rec_ch, winning_guess = recover_plaintext_last_byte(orig_iv_byte)
print("padding_oracle_recovered=", rec_ch, "winning_iv_byte=", hex(winning_guess))
print("etm_tampered_iv=", verify_encrypt_then_mac(b"TAMPERED_IV", b"CIPHER", b"k", "bad_tag"))
```

### Шаг 2. Запусти программу и проверь работу обеих криптографических моделей

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
lcg_predicted_next= 1359994880 lcg_recovered_s0= True
padding_oracle_recovered= Z winning_iv_byte= 0x95
etm_tampered_iv= REJECTED_BEFORE_DECRYPT:mac_mismatch_padding_oracle_impossible
```

Разберём, что произошло:
- зная состояние `s1`, функция `lcg_next` предсказала следующее псевдослучайное число `1359994880`, а функция `lcg_prev` через обратный элемент по модулю $2^{31}$ точно восстановила предыдущий секретный сид `s0 = 424242` (`lcg_recovered_s0= True`);
- функция `recover_plaintext_last_byte` вообще не знала `SECRET_DK_LAST_BYTE = 0x94`, но за один проход `0..255` нашла байт `winning_iv_byte= 0x95`, при котором `0x94 ^ 0x95 == 0x01`, вычислила `intermediate_dk_byte = 0x94` и восстановила скрытый символ открытого текста `'Z'`;
- при включении `verify_encrypt_then_mac` любая попытка изменить байт `IV` отвергается на этапе проверки `HMAC` до вызова дешифратора (`REJECTED_BEFORE_DECRYPT:mac_mismatch_padding_oracle_impossible`).

### Шаг 3. Проверь валидацию дополнения `PKCS#7` в терминале Kali

В файле `lab.py` замени `ord("Z")` на `ord("K")`, сохрани и запусти `python3 lab.py` — атака через `Padding Oracle` точно так же восстановит букву `'K'`. После проверки верни `ord("Z")`.

В терминале Kali проверь правило корректного дополнения `PKCS#7` (все последние $N$ байт обязаны быть равны числу $N$):

```bash
python3 -c 'b=b"DATA\x04\x04\x04\x04"; pad=b[-1]; print("valid_pkcs7=", 1<=pad<=16 and b[-pad:]==bytes([pad])*pad)'
```

## Почему это работает: Почему `CBC Padding Oracle` позволяет не только расшифровать, но и зашифровать любой текст (`CBC-R`)

Зная промежуточный блок $D_K(C_i)$ для любого блока $C_i$, атакующий может выбрать желаемый открытый текст $P_{\text{evil}}$ (например, `{"admin": true}`) и положить $C_{i-1} = D_K(C_i) \oplus P_{\text{evil}}$. Тогда при расшифровке на сервере получится $D_K(C_i) \oplus C_{i-1} = P_{\text{evil}}$!

## Если не получилось: Частые ошибки

- **Возвращать клиенту разные коды ответа (`500` при ошибке `PKCS#7` и `401` при ошибке JSON после расшифровки)**: даже если текст ошибки скрыт, разница в HTTP-статусе или времени ответа создаёт полноценный оракул дополнения. Используй аутентифицированное шифрование `AES-GCM` или `ChaCha20-Poly1305`.
