# Chatwork MCP Server

AI から Chatwork にメッセージを届けたり、部屋の様子を見に行ったりできる、小さな MCP (Model Context Protocol) サーバーです。

「この部屋にこの内容を送って」「最近のメッセージを確認して」と自然に頼むだけで、AI が Chatwork API とのやり取りを引き受けます。複数アカウントにも対応しているので、投稿するアカウントを切り替えながら、必要なチャンネル操作だけを軽く使えます。

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

`CHATWORK_ACTIVE_TOOLS` 環境変数で起動時に有効化するツールをカンマ区切りで指定することで、不要なツール定義をコンテキストから除去し **LLM へのトークン投入量を最小化** できます。

```json
"env": {
  "CHATWORK_API_TOKEN": "YOUR_TOKEN",
  "CHATWORK_ACTIVE_TOOLS": "list_rooms,get_room,post_room_message,read_room_messages"
}
```

指定しない場合のデフォルト: `list_accounts,list_rooms,get_room,list_room_messages,post_room_message,read_room_messages`

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

設定変更後は MCP サーバーの再起動（Claude Code なら `/mcp restart`）が必要です。

## 使い方

Claude Desktop を例に説明します。

1. Claude Desktop を起動
2. メニューから「設定」をクリック
3. 「開発者」タブをクリック
4. 「構成を編集」をクリック
5. ファイルビューワーで `claude_desktop_config.json` が示されるので、好みのエディタで開く
6. 以下の設定を入力する

```json
{
  "mcpServers": {
    "chatwork": {
      "command": "npx",
      "args": ["@chatwork/mcp-server"],
      "env": {
        "CHATWORK_API_TOKEN": "YOUR_CHATWORK_API_TOKEN"
      }
    }
  }
}
```

今後、MCP に対応した AI ツールが増える可能性があります。使い方を追加してほしいツールがあった場合、あなたのコントリビュートをお待ちしています！
