# 授業モニター ロック - Chrome拡張機能

生徒が授業セッションに参加している間、他のタブへの移動を完全にブロックします。

---

## ✅ できること

| 機能 | 詳細 |
|------|------|
| 新しいタブをブロック | 開こうとした瞬間に自動で閉じる |
| 他タブへの切り替えをブロック | 即座に授業タブに戻す |
| 授業タブを閉じてもすぐ再オープン | 閉じると自動で再度開く |
| セッション終了で自動解除 | 先生が授業を終了すると自動解除 |
| 普段は完全に無効 | セッション参加中だけ有効 |

---

## 🔧 導入手順

### Step 1: student.html のURLを設定

`background.js` の1行目を編集してください：

```js
const STUDENT_PAGE_URL = 'https://YOUR_HOST/student.html';
// ↓ 例
const STUDENT_PAGE_URL = 'https://example.github.io/student.html';
```

### Step 2: Google Admin で拡張機能を強制インストール

1. Google 管理コンソール (admin.google.com) を開く
2. **デバイス → Chrome → アプリと拡張機能 → ユーザーとブラウザ**
3. 対象の組織部門（生徒OU）を選択
4. **「+」→「ファイルからChromeアプリをアップロード」** でこのフォルダをZIP圧縮してアップロード
5. ポリシーを「**強制インストール**」に設定

> ⚠️ 先生アカウントのOUには適用しないこと

### Step 3: 動作確認

1. 生徒アカウントでChromebookにログイン
2. 先生がセッションを開始してURLを共有
3. 生徒がそのURLを開く
4. 自動的にロックが有効になることを確認

---

## 🔄 動作の流れ

```
先生がセッション開始
      ↓
生徒が student.html?session=xxx を開く
      ↓
拡張機能がURLパラメータを検出
      ↓
background.js がロック状態に移行
  - 新規タブ → 即閉じる
  - 他タブへ移動 → 授業タブに戻す
  - 授業タブを閉じる → すぐ再オープン
      ↓
background.js が5秒ごとにFirebaseをチェック
      ↓
先生がセッション終了（sessions/{id}/active = false）
      ↓
自動ロック解除・通常使用に戻る
```

---

## ⚙️ ファイル構成

```
jugyou-lock-extension/
├── manifest.json      # 拡張機能の定義
├── background.js      # タブ監視・ロック制御（要: URLを設定）
├── content.js         # student.htmlに注入してセッション情報を送信
├── popup.html         # アイコンクリック時のUI
├── popup.js           # ポップアップのロジック
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # このファイル
```

---

## ❓ よくある質問

**Q: 生徒が拡張機能を無効化できますか？**  
A: Google Admin で「強制インストール」に設定すると、生徒は無効化・削除できません。

**Q: 先生の Chromebook にも適用されますか？**  
A: 先生アカウントのOUには適用しなければ影響ありません。OUを分けて管理してください。

**Q: ネットワーク切断時はどうなりますか？**  
A: ロック中はロックが維持されます。Firebase への接続が復旧すると再度セッション状態を確認します。

**Q: student.html のURLはどこで設定しますか？**  
A: `background.js` の先頭にある `STUDENT_PAGE_URL` を編集してください。
