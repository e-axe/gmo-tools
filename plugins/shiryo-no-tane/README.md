# 資料の種

GMO営業向けのChatGPTプラグイン「資料の種」の正本ソースです。

商談メモと企業URLから、商談まとめ、SEOキーワード、STP分析、競合サイト、ディスプレイ広告向け動画A/Bコンセプト、提案メリット文を作成します。

## 配布

配布用ZIPはGoogle Drive側で管理します。

- `latest/` : 常に最新版
- `releases/` : 過去バージョン
- `source/` : ソースバックアップ

同僚は配布用ZIPをChatGPTのPlugin Creatorに渡してインストール・更新します。

## 更新運用

1. このGitHubソースを正本として更新
2. `plugin.json` のversionを更新
3. `CHANGELOG.md` を更新
4. 配布ZIPを生成
5. Google Driveの `latest` を差し替え
6. Google Driveの `releases` にバージョン固定ZIPを追加

## Version

1.0.0
