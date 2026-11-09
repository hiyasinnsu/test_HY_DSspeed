# DS SPEED

スマホのブラウザで遊べる縦スクロール弾幕シューティング。ビルド不要の素の ES Modules + Canvas 2D で動きます。

**プレイ: https://hiyasinnsu.github.io/test_HY_DSspeed/**

## 特徴

- スマホ縦画面に最適化した 9:16 のプレイフィールド（DPR 対応、横向きでもプレイ可）
- ドラッグ操作で移動、ショットは自動。2本指タッチで低速移動＋当たり判定表示
- 自機 3 種の難易度（かんたん／ふつう／むずかしい）
- ウェーブ → 中ボス → 3 スペルカードのボス、という 1 ステージ構成
- グレイズ、ボム、残機、スペルカード名とタイマー付き HP バー、ハイスコア保存
- WebAudio による効果音と BGM（外部アセットなし）
- キーボード操作（矢印 / WASD、Shift、Z、P、Enter）

## あそびかた

| 操作 | 内容 |
| --- | --- |
| 画面ドラッグ | 移動（相対移動）。ショットは自動 |
| 2本指タッチ | 低速移動。自機の当たり判定が表示される |
| BOMB ボタン / Z | ボム。周囲の弾を消してダメージ |
| ポーズボタン / P / Esc | ポーズ |
| 矢印キー / WASD | 移動 |
| Shift | 低速移動 |

被弾すると残機が減り、無敵時間つきで復帰します。残機が尽きるか、ボスを倒すとリザルトへ。

## 開発

```sh
npm run serve     # http://127.0.0.1:8123/ で確認
npm test          # ロジック + ヘッドレスブラウザのテスト
npm run sim       # 無敵ボットでステージを自動プレイし、バランスを数値確認
```

`npm test` は Chrome をヘッドレス起動して、起動・移動・ボム・ポーズ・リザルト・ボス戦・FPS・
コンソールエラーまで確認します（`CHROME_PATH` で実行ファイルを指定可能）。

## 構成

```
index.html              画面と UI
styles/main.css         UI とレイアウト
src/app.js              画面遷移・ループ・入力/音/記録の接続
src/game/               シミュレーション（DOM 非依存の純ロジック）
  world.js              エンティティ、衝突、スコア、状態
  player.js             自機、ショット、ボム、被弾
  enemies.js            敵の生成と挙動
  boss.js               ボスとスペルカード
  stage.js              ステージタイムライン
  patterns.js           弾幕パターンのヘルパー
  config.js             定数・難易度・弾のスタイル
src/core/               math / pool / input / audio / storage
src/view/               renderer（Canvas 2D）とスプライト生成
tests/                  Node テストとブラウザスモークテスト
tools/                  静的サーバ、バランスシミュレータ、ブラウザチェック
```

ゲームロジックは DOM に触れないため、Node 上でそのまま何千フレームも実行して検証できます。

## 公開

GitHub Pages（`main` ブランチのルート）で配信しています。`index.html` は相対パスで参照しているので、
`https://<user>.github.io/<repo>/` のようなサブパスでもそのまま動きます。`.nojekyll` により Jekyll 処理を無効化。
