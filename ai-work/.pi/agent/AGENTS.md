# 基本方針

- 日本語で回答する。
- 作業前、作業中、作業後に todo を更新する。
- 作業前に方針を確認し、承認をもらうこと。承認を貰うまでは実施しない。
- commit メッセージとコード内コメントは英語で記載する。
- リモートへの変更は push は必ず人間が実施。あなたは gh コマンドで実施できる範囲のみ行う。
- まず README.md を見る。リンクされたドキュメントもすべて見る。
- 必要なコマンドが不足する場合は、ユーザーにインストール実行を要求して待機する。
- コードの検証などはすべて専用のエフェメラルコンテナ (podman) で実施する。

# 知見・memory

- 作業開始前・"いつもの"発言時・行き詰まり時は memory を確認する。
- 汎用性のある知見や失敗は memory mcp に記録する。必要なら relation を設定。特定プロダクト依存の内容は記録しない。
- Notion への記録はユーザーが明言した場合のみ行う。

# ツール

- web 系開発では動作検証に playwright-cli スキルを利用する。
- コンテナは podman を利用する。
- バージョン管理は mise を利用する。グローバル利用 (`-g`) はしない。本家より優れた管理手法 (uv 等) があれば使う。

# Development

- 単発で終わらない作業だと判断される場合は "planning-with-files" スキルを使う。作成するファイルを含むディレクトリは `.gitignore` に記載する。

## ゼロからの開発

- "local" ブランチで適切な作業単位に commit しながら進める。
- 全作業完了後にのみ、成果物の試用方法と合わせてテストを依頼する。OK 後 main に移行し "first commit" する。

## 既存レポジトリ

- 作業内容に合わせたブランチを切る。

## 共通

- push するだけで済む状態まで整える。
- commit メッセージは 1 行。

## 委譲 (Delegation)

実装タスクが以下をすべて満たす場合、subagent に委譲してよい:
- 実装計画と受け入れ条件がドキュメントで明文化されている
- テスト・lint・型検査で決定論的に検証できる
- 外部システムへの対話的アクセスを要しない
- 自分 (親) が同時に同じファイルを編集しない

# CI/CD

ユーザーから要望時のみ作成。workflow は以下ルールに従う。

## ルール

- ビルド workflow はタグのみトリガー。
- ドキュメント作成はトリガーから除外 (path で回避)。

## 成果物

1. push 時に実行する Lint / Format チェック workflow。
2. CHANGELOG.md から該当バージョン内容を抽出し Release ノートに挿入する workflow。
   - prepare-release に、タグから得た version で CHANGELOG.md の該当セクションを抽出する step を追加。
   - リリース action に抽出結果を body として渡し、Release 作成時点で本文を確定。
3. docker 前提 → 自動ビルド・push workflow。
4. docker 前提でない → バイナリビルドして releases に含める (windows は対象外)。

# Documents

- マークダウン内のリンクは"ファイル名"のみ。ユーザーにリンク編集が必要な旨を伝える。

## 成果物

1. README.md (英語)
2. README-JP.md (日本語)
3. CHANGELOG.md (英語)
4. CONTRIBUTING.md (英語)

# Directory

ベストプラクティス構成:

```
.
├── CONTRIBUTING.md
├── README-jp.md
├── README.md
├── backend
├── docker
├── docs
└── frontend
```
