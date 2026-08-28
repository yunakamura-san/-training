# Thinktrain

毎日約15分、SlackのDMで実務ケースに答えながら構造化思考を鍛える、自分専用のトレーナーです。

- 7つの小さなステップで回答し、中断後も続きから再開
- 平日9:00（日本の祝日を除く）に出題、未着手なら60分後に一度だけ通知
- 厳しめの9カテゴリ評価と、最大2件に絞った改善フィードバック
- 直近5回と前日の弱点を使う0〜100の連続難易度
- 最初の5回は診断、10回ごとにガイドなしベンチマーク
- 履歴、弱点の再発、難易度補正済み能力値をブラウザで確認

ローカルファーストで、Dockerは使いません。回答・評価はMac上のPostgreSQLへ保存し、SlackとはSocket Modeで接続します。

## 構成

- Next.js 16 / React 19 / TypeScript
- Slack Bolt / Socket Mode
- PostgreSQL
- Antigravity CLI → Ollama の順でAI評価
- node-cron / date-holidays
- Vitest

詳細な仕様は [`docs/DESIGN.md`](docs/DESIGN.md) を参照してください。

## まず画面を確認する

Node.js 20以降が必要です。

```bash
npm install
npm run dev
```

[http://127.0.0.1:43127](http://127.0.0.1:43127)を開きます。DB未設定時はデモデータを表示します。

## ローカルセットアップ

### 1. PostgreSQL

既存のローカルPostgreSQLを利用できます。他のアプリとテーブルを混在させないため、`thinktrain`専用DBを作ります。

```bash
cp .env.example .env.local
npm run db:create
npm run db:migrate
```

ローカルDBのユーザー名やポートが異なる場合は、`.env.local`の`DATABASE_URL`を修正してください。

```dotenv
DATABASE_URL=postgresql://localhost:5432/thinktrain
```

### 2. Antigravity CLI

旧Gemini CLIの無料Tierは終了しているため、公式後継のAntigravity CLIを利用します。

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
agy
agy -p 'JSONだけで {"ok":true} と返してください' --output-format text
```

Google OAuthでは会社アカウントを選び、信頼対象は`thinktrain`フォルダだけにしてください。Botは低推論負荷とサンドボックスを指定して`agy`を実行します。利用できない場合は`OLLAMA_URL`のOllamaを試し、どちらも失敗した場合は偽のAI採点へ黙って切り替えずエラーを返します。

画面確認だけでデモ採点を許可する場合に限り、次を設定します。

```dotenv
ALLOW_MOCK_AI=true
```

### 3. Slack App

1. [Slack API](https://api.slack.com/apps)で「Create New App」→「From an app manifest」を選択
2. [`slack-manifest.yaml`](slack-manifest.yaml)を貼り付ける
3. Appをワークスペースへインストールし、Bot User OAuth Token（`xoxb-...`）を取得
4. 「Basic Information」→「App-Level Tokens」で`connections:write`を持つToken（`xapp-...`）を作成
5. Signing Secret、自分のMember ID、AppとのDM Channel IDを`.env.local`へ設定

```dotenv
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...
SLACK_USER_ID=U...
SLACK_CHANNEL_ID=D...
```

Member IDはSlackのプロフィールから「メンバーIDをコピー」で取得できます。DM Channel IDはAppとのDMをブラウザ版Slackで開いたURLの、`D`から始まる部分です。

実際のTokenやSecretはチャットへ貼らず、`.env.local`だけに保存してください。

### 4. 起動

開発中はWeb画面とBotをまとめて起動できます。

```bash
npm run dev:all
```

個別に起動する場合：

```bash
npm run dev
npm run dev:worker
```

## Macログイン時に自動起動

初回のみ本番ビルドを作り、自動起動を登録します。

```bash
npm run build
chmod +x scripts/install-macos-service.sh
./scripts/install-macos-service.sh
```

以後はMacへのログイン時にWeb画面とBotが起動します。PCが9時より後に起動しても、その日の未送信を検知します。プロセスは5分ごとに配信状態を確認し、Slack送信に失敗した場合は次回確認時に再試行します。

ログ：

```text
~/Library/Logs/Thinktrain/
```

自動起動を解除する場合：

```bash
launchctl bootout "gui/$(id -u)/com.thinktrain.local"
rm ~/Library/LaunchAgents/com.thinktrain.local.plist
```

## 検証

```bash
npm run check
```

## セキュリティ

- 架空ケースだけを使用し、顧客名・商談情報・社内数値は回答しない
- `.env.local`、Slack Token、DB接続情報はGitへ追加しない
- Antigravity CLIの子プロセスにはSlack TokenとDB認証情報を渡さない
- AIへ送るのは当日の問題、当日の回答、固定評価基準だけ
- Slackにはワークスペースの保持ポリシーが適用される
- 会社アカウントでのAntigravity CLI自動利用は、社内ルールを別途確認する
