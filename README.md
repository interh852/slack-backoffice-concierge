# Backoffice Concierge 🤖✨

Google Apps Script (GAS) と Gemini API を活用した、バックオフィス業務を自動化する高度な Google Chat ボットです。
AI 技術を搭載し、自然言語での対話を通じて複雑な事務作業をスマートに処理します。

## 🌟 主な機能

### 1. AI による自然言語解析
Gemini API を統合しており、ユーザーの曖昧な入力から意図を抽出します。
- **自由な入力**: 「交通費精算して」「片道450円で申請」「昨日の分忘れてた」など、自然な会話で操作が可能。
- **意図の自動判別**: 入力内容から「精算の開始」や「金額の設定」を賢く判断します。

### 2. 通勤費精算の自動化
Google カレンダーの「出社」イベントを自動集計し、スプレッドシートに記録を保存します。
- **スマート集計**: 指定された精算期間（デフォルト：前月16日〜当月15日）の出社日を自動抽出。
- **自動計算**: 片道の金額を伝えるだけで、往復分を自動計算して申請。
- **詳細レポート**: 集計結果（出社日リスト、日数、合計金額）をチャットで即座にフィードバック。

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

| プロパティ名 | 説明 |
| :--- | :--- |
| `COMMUTE_EXPENSE_SPREDSHEET` | 保存先および設定管理用の Google スプレッドシート ID |
| `GEMINI_API_KEY` | Google AI Studio で発行した Gemini API キー |

### 4. スプレッドシートの設定
管理用のスプレッドシートに以下のシートを作成し、設定値を入力してください。

#### 「情報」シート
ボットの動作モデルを指定します。
- **B1 セル**: 使用するモデル名（例: `gemini-2.5-flash-lite`）

#### 「通勤費」シート
AI の振る舞いを定義するシステムプロンプトを設定します。
- **B1 セル**: システムプロンプト（AI への指示文）

### 5. Google Chat API の設定
Google Cloud Console にて Google Chat API を有効にし、Apps Script プロジェクトと紐付けを行ってください。

## 📖 使い方

1. Google Chat で 「Backoffice Concierge」を開始。
2. **「通勤費の精算をお願い」** のように話しかけます。
3. 金額が不明な場合はボットから尋ねられます。**「片道500円」** のように答えてください。
4. カレンダーから出社日が抽出され、自動で精算処理が完了します。

## 🛠 テクニカルスタック

- **Engine**: Google Apps Script (GAS)
- **AI**: Gemini 2.0 Flash Lite (Google AI Studio)
- **Services**: Google Calendar API, Google Sheets API, Google Chat API
- **Tooling**: Clasp, Jest (Testing), Prettier

## 🏗 ディレクトリ構成
```
src/
├── ChatHandler.js           # チャットイベントのハンドリング & 意図解析
├── GeminiService.js         # Gemini API との通信
├── CommuteExpenseUseCase.js # 通勤費精算のビジネスロジック
├── CalendarService.js       # Googleカレンダー連携
├── SpreadsheetService.js    # スプレッドシート連携
├── PeriodCalculator.js      # 精算期間の計算ロジック
├── Constants.js             # 定数・設定管理
└── main.js                  # エントリーポイント
```

## ✅ 開発者向け
### テストの実行
```bash
npm test
```
### コードフォーマット
```bash
npm run format
```
