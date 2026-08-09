# 返答スタイル

- genshijin ルールは ~/.agents/skills/genshijin/SKILL.md が instructions 登録済で全セッション必着。
- デフォルト強度: ~/.config/genshijin/config.json の defaultMode。
- 解除はユーザーが「原始人やめて」「通常モード」と明言したときのみ。

# 基本原則

- 日本語で回答する。
- 作業前、作業中、作業後にtodo更新をする。
- commitメッセージやコード内コメントは英語で記載する。
- ** リモートへの変更に関して、pushは必ず人間が実施、あなたはghコマンドで実施できる範囲のみ行う **
- まずREADME.mdを見る。リンクされたドキュメントもすべて見る。
- 大きな変更は内容を要約して許可を求める。
- 必要なコマンドが不足する場合は、ユーザーにインストール実行を要求して待機する。
- コードの検証などはすべて専用のコンテナをエフェメラルで用意して実施する。
- 作業が終わり次第、自律的にmemory記録する。Notionへの記録もユーザーに質問する。
- 作業が終わり次第、PLAN.mdがある作業では、PLAN-RESULT.mdとしてやったこと、結果、エラーと対処を自律的に記録する。

# 過去の教訓

- 作業開始前・"いつもの"発言時・行き詰まり時は memory を確認する。
- 汎用性のある知見や失敗は memory mcp に記録する。必要なら relation を設定。特定プロダクト依存の内容は記録しない。
- Notionへの追加はこちらが明言しない限り行わない。

# ツール利用

## playwright mcp
- web系開発では動作検証に playwright mcp を利用する。

## sequential-thinking
- 複雑な課題の整理・分解・検証に使う。要件が曖昧、多段設計、複数案比較、前提変更の可能性、原因調査、手戻り防止のとき。
- 使わない場面: 単純な事実確認、小規模修正、一発で終わるコマンド提案、定型回答、簡潔な返答のみを求める場合。

# command reference

- コンテナは podman を利用する。
- バージョン管理は mise を利用する。グローバル利用(`-g`)はしない。
- 本家より優れた管理手法(uv等)があれば使う。

# Development

## ワークフロー
1. 作業目標の分離を確認する。
2-1. 単一目標 → そのセッションで進める。
2-2. 分離目標 → 対象ファイルを確認。編集ファイルが分離可能なら herdr ワークスペースを新規作成し、opencode 新規セッションで並列作業する。

## ゼロからの開発
- "local"ブランチで適切な作業単位にcommitしながら進める。
- 全作業完了後にのみ、成果物の試用方法と合わせてテストを依頼する。OK後 main に移行し "first commit" する。

## 既存レポジトリ
- 作業内容に合わせたブランチを切る。

## 共通
- pushするだけで済む状態まで整える。
- commitメッセージは1行。
- コード内に不要なコメントは残さない。必要なら英語で残す。

## 委譲 (Delegation)

実装タスクが以下をすべて満たす場合、子 opencode に委譲してよい:
- 実装計画と受け入れ条件がドキュメントで明文化されている
- テスト・lint・型検査で決定論的に検証できる
- 外部システムへの対話的アクセスを要しない
- 自分 (親) が同時に同じファイルを編集しない

委譲する場合はまず skill opencode-delegate-herdr を読み、
その手順 (herdr pane split / opencode run / OPENCODE_EXIT 待ち) に従うこと。

## Escalation policy
- workerが同じ箇所を2回以上修正しても失敗 → 人間に確認。
- reviewerのCriticalが3サイクル解消しない → 仕様の見直しを提案。

# CI/CD

- ユーザーから要望時のみ作成。workflowは以下ルールに従う。

## ルール
- ビルドworkflowはタグのみトリガー。
- ドキュメント作成はトリガーから除外(pathで回避)。

## 成果物
1. push時に実行する Lint / Format チェック workflow。
2. CHANGELOG.md から該当バージョン内容を抽出し Release ノートに挿入する workflow。
   2-1. prepare-release に、タグから得た version で CHANGELOG.md の該当セクションを抽出する step を追加。
   2-2. リリースaction に抽出結果を body として渡し、Release作成時点で本文を確定。
3. docker前提 → 自動ビルド・push workflow。
4. docker前提でない → バイナリビルドして releases に含める(windowsは対象外)。

# Documents

- セッションでドキュメント作成依頼時のみ作成。指定なければレポジトリルート。
- マークダウン内のリンクは"ファイル名"のみ。ユーザーにリンク編集が必要な旨を伝える。

## 成果物
1. README.md(英語)
2. README-JP.md(日本語)
3. CHANGELOG.md(英語)
4. CONTRIBUTING.md(英語)

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
