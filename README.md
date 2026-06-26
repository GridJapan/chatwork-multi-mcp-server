# Chatwork MCP Server (Multi-Account)

> ### 🚀 Powered by [GridJapan株式会社](https://ai.gridjapan.com/)
> **GridAI** — 業務に AI を組み込み、開発・運用・営業を自動化する AI ソリューション。
> 本リポジトリは GridJapan の AI 開発の一環として公開しています。
> 詳細・お問い合わせ → **https://ai.gridjapan.com/**

AI から Chatwork にメッセージを届けたり、部屋の様子を見に行ったりできる MCP (Model Context Protocol) サーバーです。

複数アカウント対応。`CHATWORK_ACCOUNTS` 環境変数でアカウントを列挙し、投稿時に `account_id` で切り替えられます。

## 環境変数

### シングルアカウント

```
CHATWORK_API_TOKEN=your_token
```

### マルチアカウント

```
CHATWORK_ACCOUNTS=alice:TOKEN_A,bob:TOKEN_B,charlie:TOKEN_C
```

- 書式: `名前:APIトークン` をカンマ区切りで並べる
- `CHATWORK_API_TOKEN` も同時に設定すると `default` アカウントとして追加される
- 両方設定した場合、`CHATWORK_ACCOUNTS` のアカウントと `default` が共存する

## このフォークの特徴

### 1. 複数アカウント対応

`CHATWORK_ACCOUNTS` 環境変数で複数の Chatwork API トークンを登録し、投稿アカウントをツール呼び出し時に指定できます。

```json
"env": {
  "CHATWORK_API_TOKEN": "DEFAULT_TOKEN",
  "CHATWORK_ACCOUNTS": "alice:TOKEN_A,bob:TOKEN_B"
}
```

### 2. アクティブツールの絞り込みによるトークン削減

MCP ツール定義は AI（LLM）への毎リクエストのコンテキストに展開されます。登録ツール数が多いほどトークン消費が増大し、応答精度の低下やコスト増につながります。

#### プリセットで一括切り替え

`CHATWORK_TOOL_PRESET` 環境変数で 0・1・2 の3段階から選択できます。

| プリセット | ツール数 | 用途 |
|-----------|---------|------|
| `0` | 30 | ほぼ全機能（破壊的操作除く） |
| `1` | 16 | 読み取り + メッセージ投稿・既読 |
| `2` | 8  | 最小限メッセージ操作（デフォルト） |

```json
"env": {
  "CHATWORK_API_TOKEN": "YOUR_TOKEN",
  "CHATWORK_TOOL_PRESET": "1"
}
```

**プリセット 0** (30ツール): `list_accounts` / `get_me` / `get_my_status` / `list_my_tasks` / `list_contacts` / `list_rooms` / `get_room` / `update_room` / `list_room_members` / `update_room_members` / `list_room_messages` / `post_room_message` / `read_room_messages` / `unread_room_message` / `get_room_message` / `update_room_message` / `delete_room_message` / `list_room_tasks` / `create_room_task` / `get_room_task` / `update_room_task_status` / `list_room_files` / `get_room_file` / `get_room_link` / `create_room_link` / `update_room_link` / `delete_room_link` / `list_incoming_requests` / `accept_incoming_request` / `reject_incoming_request`

**プリセット 1** (16ツール): `list_accounts` / `get_me` / `get_my_status` / `list_my_tasks` / `list_contacts` / `list_rooms` / `get_room` / `list_room_members` / `list_room_messages` / `post_room_message` / `read_room_messages` / `get_room_message` / `list_room_tasks` / `get_room_task` / `list_room_files` / `get_room_file`

**プリセット 2** (8ツール・デフォルト): `list_accounts` / `list_rooms` / `get_room` / `list_room_members` / `list_room_messages` / `post_room_message` / `read_room_messages` / `get_room_message`

#### 個別指定で上書き

`CHATWORK_ACTIVE_TOOLS` をカンマ区切りで指定するとプリセットより優先されます。

```json
"env": {
  "CHATWORK_API_TOKEN": "YOUR_TOKEN",
  "CHATWORK_ACTIVE_TOOLS": "list_rooms,get_room,post_room_message"
}
```

設定変更後は MCP サーバーの再起動（Claude Code なら `/mcp restart`）が必要です。

利用可能なツール名の一覧:

| カテゴリ | ツール名 |
|---------|---------|
| アカウント | `list_accounts` |
| 自分情報 | `get_me`, `get_my_status`, `list_my_tasks`, `list_contacts` |
| ルーム管理 | `list_rooms`, `create_room`, `get_room`, `update_room`, `delete_or_leave_room` |
| メンバー | `list_room_members`, `update_room_members` |
| メッセージ | `list_room_messages`, `post_room_message`, `read_room_messages`, `unread_room_message`, `get_room_message`, `update_room_message`, `delete_room_message` |
| タスク | `list_room_tasks`, `create_room_task`, `get_room_task`, `update_room_task_status` |
| ファイル | `list_room_files`, `get_room_file` |
| 招待リンク | `get_room_link`, `create_room_link`, `update_room_link`, `delete_room_link` |
| コンタクト承認 | `list_incoming_requests`, `accept_incoming_request`, `reject_incoming_request` |

## インストール

npm レジストリには公開していません。リポジトリを clone してビルドし、生成された `dist/index.js` を Node で直接起動します。

```bash
git clone https://github.com/GridJapan/chatwork-multi-mcp-server.git
cd chatwork-multi-mcp-server
npm install
npm run build   # dist/index.js を生成
```

以降の設定例では、`command` に `node`、`args` にビルドした `dist/index.js` の**絶対パス**を指定します（`/path/to/...` は自分の clone 先に置き換えてください）。

## 使い方

Claude Desktop を例に説明します。

1. Claude Desktop を起動
2. メニューから「設定」をクリック
3. 「開発者」タブをクリック
4. 「構成を編集」をクリック
5. `claude_desktop_config.json` を好みのエディタで開く
6. 以下の設定を入力する

### シングルアカウント設定例

```json
{
  "mcpServers": {
    "chatwork": {
      "command": "node",
      "args": ["/path/to/chatwork-multi-mcp-server/dist/index.js"],
      "env": {
        "CHATWORK_API_TOKEN": "YOUR_CHATWORK_API_TOKEN"
      }
    }
  }
}
```

### マルチアカウント設定例

```json
{
  "mcpServers": {
    "chatwork": {
      "command": "node",
      "args": ["/path/to/chatwork-multi-mcp-server/dist/index.js"],
      "env": {
        "CHATWORK_ACCOUNTS": "alice:TOKEN_ALICE,bob:TOKEN_BOB"
      }
    }
  }
}
```

## 利用可能なツール

| ツール | 説明 |
| --- | --- |
| `list_accounts` | 設定済みアカウント ID 一覧を返す |
| `get_room` | チャット情報（名前・種類など）を取得 |
| `list_room_messages` | チャットのメッセージ一覧を最大 100 件取得 |
| `post_room_message` | チャットにメッセージを投稿 |
| `read_room_messages` | チャットのメッセージを既読にする |

`post_room_message` と `read_room_messages` は `account_id` パラメータで送信アカウントを指定できます。省略時はデフォルトアカウントを使用します。

## アカウント切り替えの例

```
# alice アカウントで room 123 にメッセージを送る
post_room_message(account_id="alice", room_id=123, body="こんにちは")

# 設定済みアカウントを確認する
list_accounts()
```

今後、MCP に対応した AI ツールが増える可能性があります。使い方を追加してほしいツールがあった場合、あなたのコントリビュートをお待ちしています！
