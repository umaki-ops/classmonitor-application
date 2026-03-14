# 授業モニター（ClassMonitor）

ChromebookとFirebaseを使ったリアルタイム授業支援ツールです。

## 機能

- 生徒の画面共有を先生がリアルタイムで確認
- ホワイトボード・アンケート・班別グループ活動
- 集中モード（生徒画面のロック）
- **PWA対応**：生徒はアプリとしてインストール可能（タブバー非表示）
- **離脱検知**：生徒が別タブを開くと先生に通知

## セットアップ

### 1. Firebase プロジェクトの作成（先生ごとに1回）

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication** → ログイン方法 → **Google** を有効化
3. **Realtime Database** を作成（本番モードでOK）
4. Realtime Database のルールを以下に設定：

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

5. プロジェクトの設定 → マイアプリ → ウェブアプリを追加 → 設定値をメモ

### 2. GitHub Pages の有効化（1回のみ）

1. リポジトリの **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main / (root)**
4. Save

公開URL: `https://umaki-ops.github.io/classmonitor-application/`

### 3. 授業の開始

1. 先生は `teacher.html` を開く
2. Firebase の設定値（apiKey・databaseURL・projectId）を入力してセッション開始
3. 発行されたURLを生徒に共有（Google Classroom等）
4. 生徒は受け取ったURLを開き、Googleログイン

### 4. 生徒のPWAインストール（推奨）

1. 生徒が Chrome でURLを開く
2. アドレスバー右の「インストール」をタップ（または ⋮ メニュー → アプリをインストール）
3. 次回からアプリとして起動（タブバー非表示）

## ファイル構成

```
/
├── teacher.html   # 先生用画面
├── student.html   # 生徒用画面（PWA対応）
├── manifest.json  # PWA設定
├── sw.js          # Service Worker
└── README.md
```
