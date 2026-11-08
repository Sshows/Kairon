## Перед началом: Как работает полиморфизм C++ в памяти и почему ошибка типа объекта подменяет вызываемую функцию

В модулях **C++ Intro**, **OO Programming** и **Advanced Topics in C++** практикума **Intro to Programming Languages** и курсе **Software Exploitation** (`pwn.college`) разбирают, как компилятор C++ превращает объекты с виртуальными методами (`virtual void render()`) в байты оперативной памяти и как возникает уязвимость **смешения типов (Type Confusion)** или подмены **таблицы виртуальных методов (`vtable`)**.

Представь приборную панель умного дома, к которой можно подключить либо «Датчик температуры» (`Sensor`), либо «Контроллер сирены» (`AlarmController`). На корпусе каждого устройства в самом начале наклеена табличка со списком адресов его кнопок (**указатель `vptr` на таблицу виртуальных методов `vtable`**). Когда центральный пульт вызывает виртуальный метод `device->trigger()`, он смотрит на первые 8 байт объекта (`vptr`), переходит в таблицу `vtable` и нажимает первую кнопку из списка (`vtable[0]`).

А теперь представь, что программист сохранил в список указатель на обычную анкету настроек (`ConfigData`), где в первых 8 байтах вместо адреса таблицы `vtable` записано просто пользовательское число `id`, и ошибочно привёл этот указатель к типу устройства через грубое C-приведение `(Device*)ptr` (**Type Confusion**)! При вызове `device->trigger()` процессор примет пользовательское число `id` за адрес таблицы функций `vtable` и попытается перейти по нему!

## Почему это работает: Указатель `vptr`, таблица `vtable`, `static_cast` против `dynamic_cast`

Разберём внутреннее устройство объектов C++ в памяти `x86-64`:

1. **Где лежит `vptr` и куда он указывает**. Если в классе C++ объявлен хотя бы один виртуальный метод (`virtual`), компилятор автоматически добавляет в самое начало каждого объекта (по смещению `0`, первые 8 байт) скрытое поле **`vptr` (Virtual Table Pointer)**. Этот указатель ссылается на неизменяемый массив указателей на функции в секции только для чтения `.rodata` — **таблицу `vtable`**.
2. **Как выполняется виртуальный вызов `obj->action()`**:
   - шаг 1: процессор читает адрес таблицы `vtable_addr = *(uint64_t*)obj` из первых 8 байт объекта;
   - шаг 2: процессор читает из таблицы адрес нужного метода `func_addr = *(uint64_t*)(vtable_addr + index * 8)`;
   - шаг 3: передаёт адрес самого объекта `obj` первым аргументом в регистр `RDI` (указатель `this`) и выполняет косвенный вызов `call func_addr`.
3. **В чём опасность `static_cast` / `(Derived*)base_ptr` (Type Confusion)**:
   - обычное приведение типов `static_cast<AdminSession*>(user_ptr)` выполняется только во время компиляции и **не проверяет** во время работы программы, действительно ли объект в памяти принадлежит классу `AdminSession`. Если в памяти на самом деле лежит объект другого класса `GuestNote`, поля двух классов накладываются друг на друга по одним и тем же смещениям!
   - напротив, безопасное приведение **`dynamic_cast<AdminSession*>(user_ptr)`** обращается к метаданным типа **RTTI (Run-Time Type Information)**, привязанным к `vtable`, и если реальный тип объекта не является `AdminSession`, безопасно возвращает `nullptr` вместо неверного указателя.
4. **Аппаратная и компиляторная защита `vtable` (CFI — Control-Flow Integrity)**. Современные компиляторы (Clang `-fsanitize=cfi-vcall`, GCC `-fvtable-verify`) перед каждым вызовом виртуального метода проверяют, что указатель `vptr` внутри объекта действительно указывает на одну из настоящих таблиц `vtable` из секции `.rodata` допустимого базового класса.

<!-- preparation -->

## Сделай сейчас: Практика: проследи диспетчеризацию `vtable`, ошибку `Type Confusion` и защиту `dynamic_cast` / `CFI`

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой редактор:

```python
RODATA_VTABLES = {
    0x402000: {"rtti": "GuestReader", "methods": [" GuestReader::view_public"]},
    0x402080: {"rtti": "AdminConsole", "methods": ["AdminConsole::run_audit"]},
}


def dispatch_virtual_call(obj_bytes_16, slot=0, enforce_cfi=True):
    vptr = int.from_bytes(obj_bytes_16[0:8], "little")
    if enforce_cfi and vptr not in RODATA_VTABLES:
        return "aborted:cfi_invalid_vptr", hex(vptr)
    if vptr not in RODATA_VTABLES:
        return "unsafe_jump_to_untrusted_vptr", hex(vptr)
    target = RODATA_VTABLES[vptr]["methods"][slot].strip()
    return f"called:{target}", hex(vptr)


def safe_dynamic_cast(obj_bytes_16, expected_rtti):
    vptr = int.from_bytes(obj_bytes_16[0:8], "little")
    meta = RODATA_VTABLES.get(vptr)
    if not meta or meta["rtti"] != expected_rtti:
        return None
    return obj_bytes_16


guest_obj = (0x402000).to_bytes(8, "little") + (101).to_bytes(8, "little")
confused_raw_data = (0x41414141).to_bytes(8, "little") + (999).to_bytes(8, "little")

print("valid_vcall=", dispatch_virtual_call(guest_obj, enforce_cfi=True))
print("confused_no_cfi=", dispatch_virtual_call(confused_raw_data, enforce_cfi=False))
print("confused_with_cfi=", dispatch_virtual_call(confused_raw_data, enforce_cfi=True))
print("dynamic_cast_to_admin=", safe_dynamic_cast(guest_obj, "AdminConsole"))
```

### Шаг 2. Запусти программу и сравни все четыре вызова

В терминале выполни:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
valid_vcall= ('called:GuestReader::view_public', '0x402000')
confused_no_cfi= ('unsafe_jump_to_untrusted_vptr', '0x41414141')
confused_with_cfi= ('aborted:cfi_invalid_vptr', '0x41414141')
dynamic_cast_to_admin= None
```

Разберём, что произошло в памяти:
- в `valid_vcall` первые 8 байт объекта `guest_obj` содержат легитимный адрес таблицы виртуальных методов `0x402000` из секции `.rodata`, поэтому диспетчер вызвал метод `GuestReader::view_public`;
- в `confused_raw_data` из-за ошибки смешения типов (или перезаписи после `Use-After-Free`) на месте объекта оказалась структура данных, где в первых 8 байтах лежит число `0x41414141`. Без проверки целостности потока управления (`enforce_cfi=False`) программа попыталась использовать `0x41414141` как адрес таблицы `vtable` (`unsafe_jump_to_untrusted_vptr`);
- при включённой защите **CFI (`enforce_cfi=True`)** программа перед вызовом проверила, входит ли `vptr` в белый список настоящих таблиц `RODATA_VTABLES`, и мгновенно прервала атаку (`aborted:cfi_invalid_vptr`);
- функция `safe_dynamic_cast(guest_obj, "AdminConsole")` проверила поле `rtti` в таблице `0x402000` (`"GuestReader" != "AdminConsole"`) и безопасно вернула `None` (`nullptr`), предотвратив ошибку смешения типов.

### Шаг 3. Проверь успешный `dynamic_cast` и просмотр таблиц `vtable` в Kali

В файле `lab.py` измени `"AdminConsole"` в последней строке на `"GuestReader"`, сохрани и запусти `python3 lab.py`. Теперь `safe_dynamic_cast` подтвердит совпадение типа `RTTI` и вернёт байты объекта вместо `None`. После проверки верни `"AdminConsole"`.

В терминале Kali ты можешь увидеть, как компилятор `g++` называет таблицы виртуальных методов (`_ZTV...` — Virtual Table) и структуры `typeinfo` (`_ZTI...` — RTTI), декодировав имя символа утилитой `c++filt`:

```bash
c++filt _ZTV12AdminConsole _ZTI12AdminConsole
```

Утилита `c++filt` переведёт внутренние имена компилятора в понятный человеку вид: `vtable for AdminConsole` и `typeinfo for AdminConsole`!

## Почему это работает: Почему виртуальная таблица `vtable` всегда должна лежать в памяти только для чтения (`.rodata`)

Сами таблицы `vtable` в современных компиляторах всегда размещаются в сегменте **только для чтения (`r--`)** (и защищаются режимом `Full RELRO`), чтобы никто не мог перезаписать адрес функции внутри существующей таблицы. А для защиты самого указателя `vptr` внутри объекта в куче используют:
1. проверку типов через `dynamic_cast` или `std::variant` вместо слепого `static_cast`;
2. компиляторную проверку **CFI (`-fsanitize=cfi`)** на `x86-64` и криптографическую подпись указателя `vptr` (**PAC**) на `ARM64`.

## Если не получилось: Частые ошибки

- **Путаница между перезаписью самой таблицы `vtable` и перезаписью указателя `vptr` в объекте**: сама таблица `vtable` лежит в `.rodata` и защищена от записи. При ошибке `Use-After-Free` или `Type Confusion` в объекте кучи подменяется не таблица в `.rodata`, а первые 8 байт самого объекта (`vptr`), чтобы они указывали на поддельную таблицу. Именно поэтому проверка CFI сверяет адрес `vptr` со списком адресов `.rodata`.
