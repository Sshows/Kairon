#!/usr/bin/env bash
# Kairon: создаёт новую папку с вымышленными учебными данными. Нет sudo, сети и удаления.
set -eu
lab_dir="$HOME/kairon-lab"
if [ -e "$lab_dir" ]; then
  printf 'Папка %s уже существует. Ничего не изменено. Используй имеющиеся учебные файлы.\n' "$lab_dir"
  exit 1
fi
mkdir "$lab_dir"
mkdir "$lab_dir/evidence"
cat > "$lab_dir/rules.txt" <<'RULES'
Учебная среда Kairon.
Работаем только с разрешёнными целями.
Разрешение владельца важнее любопытства.
Реальные пароли и персональные данные сюда не вводим.
RULES
printf 'Ты нашёл скрытый учебный файл.\n' > "$lab_dir/.welcome"
cat > "$lab_dir/evidence/memo.txt" <<'MEMO'
Дело № 001
Источник: синтетический учебный набор Kairon.
Проверь auth.log и запиши наблюдения.
MEMO
cat > "$lab_dir/auth.log" <<'LOG'
Oct 24 10:01:00 training sshd: Failed password for demo from 10.0.0.44
Oct 24 10:01:03 training sshd: Failed password for demo from 10.0.0.44
Oct 24 10:01:07 training sshd: Accepted password for student from 10.0.0.12
Oct 24 10:01:09 training sshd: Failed password for demo from 10.0.0.44
LOG
printf 'DEMO_KEY=training-data-only\nЭто вымышленные данные, а не действующий секрет.\n' > "$lab_dir/secrets.txt"
chmod 644 "$lab_dir/secrets.txt"
printf 'Готово. Выполни: cd ~/kairon-lab\n'
