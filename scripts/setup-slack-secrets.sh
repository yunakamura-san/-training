#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$ENV_FILE がありません。先にDATABASE_URLを設定してください。" >&2
  exit 1
fi

read -r -s -p "Bot Token (xoxb-): " SLACK_BOT_TOKEN
echo
read -r -s -p "App Token (xapp-): " SLACK_APP_TOKEN
echo
read -r -s -p "Signing Secret: " SLACK_SIGNING_SECRET
echo
read -r -p "Member ID (U...): " SLACK_USER_ID

[[ "$SLACK_BOT_TOKEN" == xoxb-* ]] || {
  echo "Bot Tokenはxoxb-から始まる値を入力してください。" >&2
  exit 1
}
[[ ${#SLACK_BOT_TOKEN} -le 200 && "$SLACK_BOT_TOKEN" != *[[:space:]]* ]] || {
  echo "Bot Tokenが長すぎるか、余分な空白を含んでいます。CopyボタンでTokenだけをコピーしてください。" >&2
  exit 1
}
[[ "$SLACK_APP_TOKEN" == xapp-* ]] || {
  echo "App Tokenはxapp-から始まる値を入力してください。" >&2
  exit 1
}
[[ ${#SLACK_APP_TOKEN} -le 200 && "$SLACK_APP_TOKEN" != *[[:space:]]* ]] || {
  echo "App Tokenが長すぎるか、余分な空白を含んでいます。" >&2
  exit 1
}
[[ ${#SLACK_SIGNING_SECRET} -ge 16 ]] || {
  echo "Signing Secretが短すぎます。" >&2
  exit 1
}
[[ "$SLACK_USER_ID" =~ ^U[A-Z0-9]+$ ]] || {
  echo "Member IDはUから始まる英数字を入力してください。" >&2
  exit 1
}

export SLACK_BOT_TOKEN SLACK_APP_TOKEN SLACK_SIGNING_SECRET SLACK_USER_ID ENV_FILE
python3 <<'PY'
import os
from pathlib import Path

path = Path(os.environ["ENV_FILE"])
updates = {
    "SLACK_BOT_TOKEN": os.environ["SLACK_BOT_TOKEN"],
    "SLACK_APP_TOKEN": os.environ["SLACK_APP_TOKEN"],
    "SLACK_SIGNING_SECRET": os.environ["SLACK_SIGNING_SECRET"],
    "SLACK_USER_ID": os.environ["SLACK_USER_ID"],
    "DASHBOARD_URL": "http://127.0.0.1:43127",
}

lines = path.read_text(encoding="utf-8").splitlines()
seen = set()
result = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line else ""
    if key in updates:
        if key not in seen:
            result.append(f"{key}={updates[key]}")
            seen.add(key)
    else:
        result.append(line)
for key, value in updates.items():
    if key not in seen:
        result.append(f"{key}={value}")
path.write_text("\n".join(result).rstrip() + "\n", encoding="utf-8")
path.chmod(0o600)
PY
unset SLACK_BOT_TOKEN SLACK_APP_TOKEN SLACK_SIGNING_SECRET SLACK_USER_ID

echo "Slack認証情報を.env.localへ安全に保存しました。"
