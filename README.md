# 筋トレ記録

筋トレの重量と回数を記録して、前回の記録や成長をグラフで見られるアプリです。記録は使っているブラウザのIndexedDBに保存します。

分析画面では、TypeScriptが重量と回数を1セットずつC++に渡し、Reactが集計結果を表示します。C++はWebAssemblyに変換してブラウザで動かしています。たとえば60 kgを5回、55 kgを8回なら、最高重量は60 kg、最大回数は8回、ボリューム（重量×回数の合計）は740 kg・回です。

集計処理は [`native/src/analytics_core.cpp`](native/src/analytics_core.cpp) にあります。[設計とテストの詳細](docs/ARCHITECTURE.md)も参照できます。

## 主な機能

- 重量・回数・セットの記録、自動保存、前回記録のコピー、中断したトレーニングの復元
- 133種目の初期データ、種目検索、お気に入り、並べ替え、カスタム種目
- トレーニング履歴の閲覧・編集・削除
- 最高重量・最大回数・推定1RM・ボリュームの推移をグラフで確認
- kg / lb表示、自重・追加重量・アシスト、ライト / ダークテーマ
- iPhoneのホーム画面追加、オフライン利用、更新通知

## Windowsで開発する

Node.jsの安定版をインストールしたWindows環境で、PowerShellまたはWindows Terminalからこのフォルダーを開きます。

```bash
npm ci
npm run dev
```

Viteが表示したローカルURLをPCのブラウザで開いてください。同じLAN内のiPhoneから開発サーバーを確認したい場合は `npm run dev -- --host` を使用できますが、iPhoneへのPWAインストールとService Workerの確認にはHTTPS環境を推奨します。

## ビルド

```bash
npm run build
```

静的ファイルは `dist` に生成されます。

Sitesで公開する場合は、次のコマンドで公開用のWorkerも生成します。

```bash
npm run build:sites
```

## テスト

```bash
npm run test
```

ブラウザ向けのテストでも同梱の実WebAssemblyを読み込みます。JavaScriptの代替計算やWASMのモックは使いません。既存の記録・分析テストに加え、4種類の負荷・欠損値・境界値・大量セット・初期化失敗時の再試行を検証します。

## C++を開発する

### ネイティブテスト

GCCまたはClangのC++17コンパイラとNode.jsを用意します。WindowsではMSYS2のMinGW GCCを使用できます。

```bash
npm run test:native
```

コンパイラを指定する場合は環境変数 `CXX` に実行ファイルのパスを設定します。CMakeを使用する場合は次の手順でも実行できます（追加ライブラリは不要です）。

```bash
cmake -S . -B build/cmake -DCMAKE_BUILD_TYPE=Release
cmake --build build/cmake
ctest --test-dir build/cmake --output-on-failure
```

### WebAssemblyの再生成

通常のWeb開発には同梱済みの `public/wasm/gym-core.wasm` を利用でき、C++コンパイラのインストールは不要です。C++ソースを変更した場合は、[公式Zig 0.15.2](https://ziglang.org/download/)のC++コンパイラで再生成してください。Zigはビルドツールとしてだけ使い、アプリの計算処理はC++で記述しています。

```bash
npm run build:wasm
npm run test:native
npm test
npm run build
```

ZigがPATHにない場合は環境変数 `ZIG` に実行ファイルのパスを設定します。C++ソースと生成WASMのSHA-256を `native/wasm-manifest.json` に記録し、`npm test` と `npm run build` で一致を検査します。ソース変更後に古いバイナリを使ってしまう場合はビルドを停止します。

この構成ではC++が数値計算、Reactが画面、IndexedDBが保存を担当します。速度の優位性は未計測です。

## 本番ビルドをローカル確認する

```bash
npm run preview
```

## iPhoneで使う方法

このアプリはPWAです。本番利用では `npm run build` で生成した `dist` をHTTPS対応の静的ホスティングへ配置してください。Cloudflare Pages、Vercel、Netlify、GitHub Pagesなどを利用できます。特定サービス固有のAPIには依存していません。

ホスティング側の設定は、ビルドコマンドを `npm run build`、公開ディレクトリを `dist` にします。URLパスを使うルーターは採用していないため、通常はSPA用の特別なリライト設定も不要です。

公開したURLをiPhoneのSafariで開き、次の順に操作します。

1. Safari下部の共有ボタンをタップ
2. 「ホーム画面に追加」をタップ
3. 名前を確認して「追加」をタップ
4. ホーム画面の「筋トレ記録」アイコンから起動

最初にオンラインで一度開くとアプリシェルがキャッシュされ、その後はオフラインでも記録・履歴・分析を利用できます。新しいバージョンが見つかった場合はアプリ内に更新案内が表示され、トレーニング中に自動リロードは行いません。

## データ保存について

筋トレ記録、種目、お気に入り、設定はすべて、そのブラウザのIndexedDBへ保存されます。サーバーへの送信やクラウドバックアップはありません。

Safariの「履歴とWebサイトデータを消去」、サイトデータの個別削除、端末の初期化などを行うと記録が失われる可能性があります。v1ではバックアップおよびCSV出力を提供していません。

## 主な構成

- React + TypeScript + Vite
- C++17のストリーミング分析エンジン / WebAssembly（実行時の外部依存・ネットワーク処理なし）
- Dexie.js / dexie-react-hooks（IndexedDB）
- Recharts（分析グラフ）
- lucide-react（UIアイコン）
- vite-plugin-pwa（Manifest / Service Worker）
- Vitest（単体テスト）

内部の重量は常にkgで保存し、表示時のみkgまたはlbへ換算します。バーベルはバー込みの総重量、ダンベルは片手1個あたり、マシンとケーブルは表示重量を入力してください。
