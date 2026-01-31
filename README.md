# Backoffice Concierge

Google Apps Script (GAS) をベースにした、バックオフィス業務を自動化する Google Chat ボットです。

## 🌟 主な機能

### 1. 通勤費精算の自動化
Google カレンダーの「出社」イベントを自動集計し、スプレッドシートに精算記録を保存します。
- **対話型入力**: チャットで片道の通勤費を入力するだけで、往復分を自動計算します。
- **カレンダー連携**: 直近の締め期間（前月16日〜当月15日）の出社日を自動で抽出します。
- **詳細レポート**: 集計結果（出社日リスト、日数、合計金額）をチャットで即座に報告します。

## 🚀 セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. GAS プロジェクトへのデプロイ
`clasp` を使用してデプロイします。
```bash
npx clasp login
npx clasp push
```

### 3. スクリプトプロパティの設定
GAS の「プロジェクトの設定」にて、以下のスクリプトプロパティを設定してください。
- `COMMUTE_EXPENSE_SPREDSHEET`: 保存先の Google スプレッドシート ID

### 4. Google Chat API の設定
Google Cloud Console にて Google Chat API を有効にし、Apps Script プロジェクトと紐付けを行ってください。

## 📖 使い方

1. Google Chat で 「Backoffice Concierge」を検索してチャットを開始。
2. 「**通勤費**」と話しかけます。
3. ボットの案内に従い、片道の通勤費（例: `500`）を入力してください。
4. 自動で計算と保存が行われ、結果が返信されます。

## 🛠 開発者向け情報

### テストの実行
```bash
npm test
```

### コードフォーマット
```bash
npm run format
```

## 🏗 アーキテクチャ
このプロジェクトは将来的な機能追加（経費精算、業務報告など）を考慮し、UseCase パターンを採用しています。

### ディレクトリ構成
```
src/
├── ChatHandler.js        # チャットイベントのハンドリング
├── CommuteExpenseUseCase.js # 通勤費精算のビジネスロジック
├── CalendarService.js    # Googleカレンダー連携
├── SpreadsheetService.js # スプレッドシート連携
├── PeriodCalculator.js   # 精算期間の計算ロジック
├── Constants.js          # 定数・設定管理
└── main.js               # エントリーポイント
```
