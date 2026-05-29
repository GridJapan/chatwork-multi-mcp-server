# Chatwork MCP Server (Multi-Account)

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
      "command": "npx",
      "args": ["@gridworld/chatwork-multi-mcp-server"],
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
      "command": "npx",
      "args": ["@gridworld/chatwork-multi-mcp-server"],
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
