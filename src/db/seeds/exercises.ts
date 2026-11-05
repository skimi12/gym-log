import type {
  Exercise,
  MuscleGroup
} from '../../types/models'

type ExerciseSeed = Pick<
  Exercise,
  | 'id'
  | 'name'
  | 'aliases'
  | 'primaryMuscle'
  | 'secondaryMuscles'
  | 'equipment'
  | 'equipmentDetail'
  | 'loadType'
>

type GroupExercise = Omit<ExerciseSeed, 'primaryMuscle'>

const BUILT_IN_CREATED_AT = '2026-08-01T00:00:00.000Z'

function group(primaryMuscle: MuscleGroup, entries: GroupExercise[]): ExerciseSeed[] {
  return entries.map((entry) => ({ ...entry, primaryMuscle }))
}

function materialize(seed: ExerciseSeed): Exercise {
  return {
    ...seed,
    isBuiltIn: true,
    isFavorite: false,
    isActive: true,
    createdAt: BUILT_IN_CREATED_AT,
    updatedAt: BUILT_IN_CREATED_AT
  }
}

const chest = group('chest', [
  {
    id: 'builtin-barbell-bench-press',
    name: 'バーベルベンチプレス',
    aliases: ['ベンチプレス', 'フラットベンチ'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-incline-barbell-bench-press',
    name: 'インクラインバーベルベンチプレス',
    aliases: ['インクラインベンチ'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック / アジャスタブルベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-decline-barbell-bench-press',
    name: 'デクラインバーベルベンチプレス',
    aliases: ['デクラインベンチ'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック / デクラインベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-bench-press',
    name: 'ダンベルベンチプレス',
    aliases: ['ダンベルプレス'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-incline-dumbbell-press',
    name: 'インクラインダンベルプレス',
    aliases: ['インクラインDBプレス'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / アジャスタブルベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-decline-dumbbell-press',
    name: 'デクラインダンベルプレス',
    aliases: ['デクラインDBプレス'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / デクラインベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-fly',
    name: 'ダンベルフライ',
    aliases: ['DBフライ'],
    secondaryMuscles: ['shoulders'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-incline-dumbbell-fly',
    name: 'インクラインダンベルフライ',
    aliases: ['インクラインフライ'],
    secondaryMuscles: ['shoulders'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / アジャスタブルベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-smith-bench-press',
    name: 'スミスマシンベンチプレス',
    aliases: ['スミスベンチ'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'smithMachine',
    equipmentDetail: 'ヴァーティカルスミスマシン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-smith-incline-press',
    name: 'スミスマシンインクラインプレス',
    aliases: ['スミスインクライン'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'smithMachine',
    equipmentDetail: 'ヴァーティカルスミスマシン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-chest-press',
    name: 'チェストプレス（Insignia）',
    aliases: ['マシンチェストプレス', 'チェストプレス'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia チェストプレス',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-pectoral-fly',
    name: 'ペクトラルフライ（Insignia）',
    aliases: ['ペックフライ', 'マシンフライ'],
    secondaryMuscles: ['shoulders'],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia ペクトラルフライ / リアデルトイド',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-wide-chest',
    name: 'アイソラテラル・ワイドチェスト',
    aliases: ['ワイドチェスト', 'ハンマーワイドチェスト'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength アイソラテラル・ワイドチェスト',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-incline-press',
    name: 'アイソラテラル・インクラインプレス',
    aliases: ['プレートロードインクラインプレス'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength アイソラテラル・インクラインプレス',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-fly-mid',
    name: 'ケーブルフライ',
    aliases: ['ケーブルクロスオーバー'],
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-fly-high-to-low',
    name: 'ハイ・トゥ・ロー ケーブルフライ',
    aliases: ['下部ケーブルフライ'],
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-fly-low-to-high',
    name: 'ロー・トゥ・ハイ ケーブルフライ',
    aliases: ['上部ケーブルフライ'],
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dips',
    name: 'ディップス',
    aliases: ['胸ディップス', '加重ディップス'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'bodyweight',
    equipmentDetail: 'ディップス設備',
    loadType: 'bodyweightAdded'
  },
  {
    id: 'builtin-assisted-dips',
    name: 'アシストディップス',
    aliases: ['補助ディップス'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'weightStack',
    equipmentDetail: 'フォースタック アシストディップ / チン',
    loadType: 'assisted'
  },
  {
    id: 'builtin-push-up',
    name: 'プッシュアップ',
    aliases: ['腕立て伏せ'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'bodyweight',
    equipmentDetail: '自重',
    loadType: 'bodyweight'
  }
])

const back = group('back', [
  {
    id: 'builtin-conventional-deadlift',
    name: 'デッドリフト',
    aliases: ['コンベンショナルデッドリフト'],
    secondaryMuscles: ['glutes', 'hamstrings', 'forearms'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック',
    loadType: 'weighted'
  },
  {
    id: 'builtin-sumo-deadlift',
    name: 'スモウデッドリフト',
    aliases: ['相撲デッドリフト'],
    secondaryMuscles: ['glutes', 'hamstrings', 'quadriceps'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック',
    loadType: 'weighted'
  },
  {
    id: 'builtin-barbell-bent-over-row',
    name: 'バーベルベントオーバーロウ',
    aliases: ['ベントオーバーロー', 'バーベルロウ'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック',
    loadType: 'weighted'
  },
  {
    id: 'builtin-pendlay-row',
    name: 'ペンドレイロウ',
    aliases: ['ペンドレイロー'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック',
    loadType: 'weighted'
  },
  {
    id: 'builtin-underhand-barbell-row',
    name: 'アンダーハンドバーベルロウ',
    aliases: ['リバースグリップロウ'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック',
    loadType: 'weighted'
  },
  {
    id: 'builtin-t-bar-row',
    name: 'Tバーロウ',
    aliases: ['Tバーロー'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Tバーロー',
    loadType: 'weighted'
  },
  {
    id: 'builtin-one-arm-dumbbell-row',
    name: 'ワンハンドダンベルロウ',
    aliases: ['ダンベルロウ', 'ワンハンドロー'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-chest-supported-dumbbell-row',
    name: 'チェストサポートダンベルロウ',
    aliases: ['インクラインダンベルロウ'],
    secondaryMuscles: ['biceps'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / アジャスタブルベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-four-stack-lat-pulldown',
    name: 'ラットプルダウン（フォースタック）',
    aliases: ['プルダウン', 'ラットプル'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'weightStack',
    equipmentDetail: 'フォースタック ラットプルダウン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-four-stack-lat-pulldown-wide',
    name: 'ワイドグリップラットプルダウン（フォースタック）',
    aliases: ['ワイドプルダウン'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'weightStack',
    equipmentDetail: 'フォースタック ラットプルダウン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-four-stack-lat-pulldown-close',
    name: 'ナローグリップラットプルダウン（フォースタック）',
    aliases: ['ナロープルダウン'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'weightStack',
    equipmentDetail: 'フォースタック ラットプルダウン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-four-stack-lat-pulldown-reverse',
    name: 'リバースグリップラットプルダウン（フォースタック）',
    aliases: ['アンダーグリッププルダウン'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'weightStack',
    equipmentDetail: 'フォースタック ラットプルダウン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-select-lat-pulldown',
    name: 'ラットプルダウン（Hammer Select）',
    aliases: ['ハンマーセレクトプルダウン'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'weightStack',
    equipmentDetail: 'Hammer Strength Select ラットプルダウン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-dual-axis-pulldown',
    name: 'デュアルアクシスプルダウン（Insignia）',
    aliases: ['デュアルプルダウン'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia デュアルアクシスプルダウン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-four-stack-low-row',
    name: 'ローロー（フォースタック）',
    aliases: ['ローロウ', 'ロウロー'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'weightStack',
    equipmentDetail: 'フォースタック ローロー',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-select-seated-row',
    name: 'シーテッドロー（Hammer Select）',
    aliases: ['ハンマーセレクトロー'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'weightStack',
    equipmentDetail: 'Hammer Strength Select シーテッドロー',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-dy-row',
    name: 'アイソラテラル・DYロー',
    aliases: ['DYロウ', 'DYロー'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength アイソラテラル DYロー',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-high-row',
    name: 'アイソラテラル・ハイロー',
    aliases: ['ハイロウ', 'ハイロー'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength アイソラテラル ハイロー',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-low-row',
    name: 'アイソラテラル・ローロー',
    aliases: ['プレートロードローロー'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength アイソラテラル ローロー',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-front-lat-pulldown',
    name: 'アイソラテラル・フロントラットプルダウン',
    aliases: ['プレートロードフロントプルダウン'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength アイソラテラル フロントラットプルダウン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-rowing',
    name: 'アイソラテラル・ローイング',
    aliases: ['プレートロードローイング'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength アイソラテラル・ローイング',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-wide-pulldown',
    name: 'アイソラテラル・ワイドプルダウン',
    aliases: ['プレートロードワイドプルダウン'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength アイソラテラル・ワイドプルダウン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-seated-row',
    name: 'ケーブルシーテッドロー',
    aliases: ['ケーブルロー', 'シーテッドケーブルロウ'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-one-arm-cable-row',
    name: 'ワンハンドケーブルロー',
    aliases: ['片手ケーブルロウ'],
    secondaryMuscles: ['biceps'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-straight-arm-pulldown',
    name: 'ストレートアームプルダウン',
    aliases: ['プルオーバーケーブル'],
    secondaryMuscles: ['triceps'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-pull-up',
    name: '懸垂（プルアップ）',
    aliases: ['懸垂', 'プルアップ', '加重懸垂'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'bodyweight',
    equipmentDetail: 'チンニング設備',
    loadType: 'bodyweightAdded'
  },
  {
    id: 'builtin-chin-up',
    name: 'チンニング',
    aliases: ['逆手懸垂', 'チンアップ'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'bodyweight',
    equipmentDetail: 'チンニング設備',
    loadType: 'bodyweightAdded'
  },
  {
    id: 'builtin-assisted-chin-up',
    name: 'アシストチンニング',
    aliases: ['補助懸垂', 'アシスト懸垂'],
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: 'weightStack',
    equipmentDetail: 'フォースタック アシストディップ / チン',
    loadType: 'assisted'
  }
])

const shoulders = group('shoulders', [
  {
    id: 'builtin-barbell-overhead-press',
    name: 'バーベルオーバーヘッドプレス',
    aliases: ['OHP', 'ミリタリープレス'],
    secondaryMuscles: ['triceps'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック',
    loadType: 'weighted'
  },
  {
    id: 'builtin-seated-barbell-shoulder-press',
    name: 'シーテッドバーベルショルダープレス',
    aliases: ['シーテッドバーベルプレス'],
    secondaryMuscles: ['triceps'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック / アジャスタブルベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-shoulder-press',
    name: 'ダンベルショルダープレス',
    aliases: ['DBショルダープレス'],
    secondaryMuscles: ['triceps'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / アジャスタブルベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-arnold-press',
    name: 'アーノルドプレス',
    aliases: ['アーノルドショルダープレス'],
    secondaryMuscles: ['triceps'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / アジャスタブルベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-lateral-raise',
    name: 'ダンベルサイドレイズ',
    aliases: ['サイドレイズ', 'ラテラルレイズ'],
    secondaryMuscles: [],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-front-raise',
    name: 'ダンベルフロントレイズ',
    aliases: ['フロントレイズ'],
    secondaryMuscles: [],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-rear-delt-dumbbell-fly',
    name: 'ダンベルリアレイズ',
    aliases: ['リアデルトフライ', 'リアレイズ'],
    secondaryMuscles: ['back'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-shoulder-press',
    name: 'ショルダープレス（Insignia）',
    aliases: ['マシンショルダープレス'],
    secondaryMuscles: ['triceps'],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia ショルダープレス',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-shoulder-press',
    name: 'アイソラテラル・ショルダープレス',
    aliases: ['プレートロードショルダープレス'],
    secondaryMuscles: ['triceps'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength アイソラテラル・ショルダープレス',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-lateral-raise',
    name: 'ラテラルレイズ（Insignia）',
    aliases: ['マシンサイドレイズ', 'マシンラテラルレイズ'],
    secondaryMuscles: [],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia ラテラルレイズ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-rear-deltoid',
    name: 'リアデルトイド（Insignia）',
    aliases: ['マシンリアデルト', 'リバースペックデック'],
    secondaryMuscles: ['back'],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia ペクトラルフライ / リアデルトイド',
    loadType: 'weighted'
  },
  {
    id: 'builtin-one-arm-cable-lateral-raise',
    name: 'ワンハンドケーブルサイドレイズ',
    aliases: ['ケーブルサイドレイズ'],
    secondaryMuscles: [],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-front-raise',
    name: 'ケーブルフロントレイズ',
    aliases: ['フロントケーブルレイズ'],
    secondaryMuscles: [],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-rear-delt-fly',
    name: 'ケーブルリアレイズ',
    aliases: ['ケーブルリアデルトフライ'],
    secondaryMuscles: ['back'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-face-pull',
    name: 'フェイスプル',
    aliases: ['ロープフェイスプル'],
    secondaryMuscles: ['back'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus / ロープ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-upright-row',
    name: 'アップライトロウ',
    aliases: ['アップライトロー'],
    secondaryMuscles: ['biceps'],
    equipment: 'barbell',
    equipmentDetail: 'バーベル',
    loadType: 'weighted'
  }
])

const biceps = group('biceps', [
  {
    id: 'builtin-barbell-curl',
    name: 'バーベルカール',
    aliases: ['アームカール'],
    secondaryMuscles: ['forearms'],
    equipment: 'barbell',
    equipmentDetail: 'バーベル',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-curl',
    name: 'ダンベルカール',
    aliases: ['DBカール'],
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-alternating-dumbbell-curl',
    name: 'オルタネイトダンベルカール',
    aliases: ['交互ダンベルカール'],
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hammer-curl',
    name: 'ハンマーカール',
    aliases: ['ダンベルハンマーカール'],
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-incline-dumbbell-curl',
    name: 'インクラインダンベルカール',
    aliases: ['インクラインカール'],
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / アジャスタブルベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-concentration-curl',
    name: 'コンセントレーションカール',
    aliases: ['集中カール'],
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-biceps-curl',
    name: 'バイセップスカール（Insignia）',
    aliases: ['マシンバイセップスカール'],
    secondaryMuscles: ['forearms'],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia バイセップスカール',
    loadType: 'weighted'
  },
  {
    id: 'builtin-seated-arm-curl-machine',
    name: 'シーテッドアームカール',
    aliases: ['プレートロードアームカール'],
    secondaryMuscles: ['forearms'],
    equipment: 'plateLoaded',
    equipmentDetail: 'シーテッドアームカール',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-curl',
    name: 'ケーブルカール',
    aliases: ['ストレートバーカール'],
    secondaryMuscles: ['forearms'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-rope-hammer-curl',
    name: 'ロープハンマーカール',
    aliases: ['ケーブルハンマーカール'],
    secondaryMuscles: ['forearms'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus / ロープ',
    loadType: 'weighted'
  }
])

const triceps = group('triceps', [
  {
    id: 'builtin-close-grip-bench-press',
    name: 'クローズグリップベンチプレス',
    aliases: ['ナローベンチプレス'],
    secondaryMuscles: ['chest', 'shoulders'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-lying-triceps-extension',
    name: 'ライイングトライセプスエクステンション',
    aliases: ['スカルクラッシャー', 'フレンチプレス'],
    secondaryMuscles: [],
    equipment: 'barbell',
    equipmentDetail: 'バーベル / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-overhead-triceps-extension',
    name: 'ダンベルオーバーヘッドトライセプスエクステンション',
    aliases: ['ダンベルフレンチプレス'],
    secondaryMuscles: [],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル',
    loadType: 'weighted'
  },
  {
    id: 'builtin-one-arm-overhead-triceps-extension',
    name: 'ワンハンドオーバーヘッドエクステンション',
    aliases: ['片手フレンチプレス'],
    secondaryMuscles: [],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-kickback',
    name: 'ダンベルキックバック',
    aliases: ['トライセプスキックバック'],
    secondaryMuscles: [],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-triceps-pressdown',
    name: 'ケーブルトライセプスプレスダウン',
    aliases: ['プレスダウン', 'ストレートバープレスダウン'],
    secondaryMuscles: [],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus / バー',
    loadType: 'weighted'
  },
  {
    id: 'builtin-rope-pressdown',
    name: 'ローププレスダウン',
    aliases: ['ロープトライセプスプレスダウン'],
    secondaryMuscles: [],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus / ロープ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-overhead-triceps-extension',
    name: 'ケーブルオーバーヘッドエクステンション',
    aliases: ['ケーブルフレンチプレス'],
    secondaryMuscles: [],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus / ロープ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-one-arm-cable-pressdown',
    name: 'ワンハンドケーブルプレスダウン',
    aliases: ['片手プレスダウン'],
    secondaryMuscles: [],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-bench-dips',
    name: 'ベンチディップス',
    aliases: ['リバースプッシュアップ'],
    secondaryMuscles: ['chest', 'shoulders'],
    equipment: 'bodyweight',
    equipmentDetail: 'ベンチ / 自重',
    loadType: 'bodyweight'
  }
])

const quadriceps = group('quadriceps', [
  {
    id: 'builtin-back-squat',
    name: 'バックスクワット',
    aliases: ['バーベルスクワット', 'スクワット'],
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック',
    loadType: 'weighted'
  },
  {
    id: 'builtin-front-squat',
    name: 'フロントスクワット',
    aliases: ['バーベルフロントスクワット'],
    secondaryMuscles: ['glutes', 'core'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック',
    loadType: 'weighted'
  },
  {
    id: 'builtin-smith-squat',
    name: 'スミスマシンスクワット',
    aliases: ['スミススクワット'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'smithMachine',
    equipmentDetail: 'ヴァーティカルスミスマシン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-goblet-squat',
    name: 'ゴブレットスクワット',
    aliases: ['ダンベルゴブレットスクワット'],
    secondaryMuscles: ['glutes', 'core'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル',
    loadType: 'weighted'
  },
  {
    id: 'builtin-bulgarian-split-squat',
    name: 'ブルガリアンスクワット',
    aliases: ['自重ブルガリアンスクワット'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'bodyweight',
    equipmentDetail: 'ベンチ / 自重・追加重量',
    loadType: 'bodyweightAdded'
  },
  {
    id: 'builtin-dumbbell-bulgarian-split-squat',
    name: 'ダンベルブルガリアンスクワット',
    aliases: ['DBブルガリアンスクワット'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-smith-bulgarian-split-squat',
    name: 'スミスマシンブルガリアンスクワット',
    aliases: ['スミスブルガリアンスクワット'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'smithMachine',
    equipmentDetail: 'ヴァーティカルスミスマシン / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-reverse-lunge',
    name: 'リバースランジ',
    aliases: ['バックランジ'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'bodyweight',
    equipmentDetail: '自重・追加重量',
    loadType: 'bodyweightAdded'
  },
  {
    id: 'builtin-dumbbell-walking-lunge',
    name: 'ダンベルウォーキングランジ',
    aliases: ['ウォーキングランジ'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-step-up',
    name: 'ダンベルステップアップ',
    aliases: ['ステップアップ'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-leg-extension',
    name: 'レッグエクステンション（Insignia）',
    aliases: ['レッグエクステンション'],
    secondaryMuscles: [],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia レッグエクステンション',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-arc-leg-press',
    name: 'アークレッグプレス（Insignia）',
    aliases: ['アークレッグプレス'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia アークレッグプレス',
    loadType: 'weighted'
  },
  {
    id: 'builtin-linear-leg-press',
    name: 'リニアレッグプレス',
    aliases: ['プレートロードレッグプレス'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength リニアレッグプレス',
    loadType: 'weighted'
  },
  {
    id: 'builtin-v-squat',
    name: 'Vスクワット',
    aliases: ['Vスクワットマシン'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength Vスクワット',
    loadType: 'weighted'
  },
  {
    id: 'builtin-hack-squat',
    name: 'ハックスクワット',
    aliases: ['ハックスクワットマシン'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'plateLoaded',
    equipmentDetail: 'プレートロード ハックスクワット',
    loadType: 'weighted'
  }
])

const hamstrings = group('hamstrings', [
  {
    id: 'builtin-barbell-rdl',
    name: 'バーベルルーマニアンデッドリフト',
    aliases: ['バーベルRDL', 'ルーマニアンデッドリフト'],
    secondaryMuscles: ['glutes', 'back'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-rdl',
    name: 'ダンベルルーマニアンデッドリフト',
    aliases: ['ダンベルRDL'],
    secondaryMuscles: ['glutes', 'back'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-smith-rdl',
    name: 'スミスマシンルーマニアンデッドリフト',
    aliases: ['スミスマシンRDL', 'スミスRDL'],
    secondaryMuscles: ['glutes', 'back'],
    equipment: 'smithMachine',
    equipmentDetail: 'ヴァーティカルスミスマシン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-seated-leg-curl',
    name: 'シーテッドレッグカール（Insignia）',
    aliases: ['シーテッドレッグカール', 'レッグカール'],
    secondaryMuscles: ['calves'],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia シーテッドレッグカール',
    loadType: 'weighted'
  },
  {
    id: 'builtin-barbell-good-morning',
    name: 'バーベルグッドモーニング',
    aliases: ['グッドモーニング'],
    secondaryMuscles: ['glutes', 'back'],
    equipment: 'barbell',
    equipmentDetail: 'パワーラック',
    loadType: 'weighted'
  },
  {
    id: 'builtin-single-leg-dumbbell-rdl',
    name: 'シングルレッグダンベルRDL',
    aliases: ['片脚ルーマニアンデッドリフト'],
    secondaryMuscles: ['glutes', 'core'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-pull-through',
    name: 'ケーブルプルスルー',
    aliases: ['プルスルー'],
    secondaryMuscles: ['glutes', 'back'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus / ロープ',
    loadType: 'weighted'
  }
])

const glutes = group('glutes', [
  {
    id: 'builtin-insignia-hip-abduction',
    name: 'ヒップアブダクション（Insignia）',
    aliases: ['アブダクション', '外転マシン'],
    secondaryMuscles: [],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia ヒップアブダクション / アダクション',
    loadType: 'weighted'
  },
  {
    id: 'builtin-insignia-hip-adduction',
    name: 'ヒップアダクション（Insignia）',
    aliases: ['アダクション', '内転マシン'],
    secondaryMuscles: ['quadriceps'],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia ヒップアブダクション / アダクション',
    loadType: 'weighted'
  },
  {
    id: 'builtin-glute-drive',
    name: 'グルートドライブ',
    aliases: ['グルートドライブマシン'],
    secondaryMuscles: ['hamstrings'],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength グルートドライブ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-barbell-hip-thrust',
    name: 'バーベルヒップスラスト',
    aliases: ['ヒップスラスト'],
    secondaryMuscles: ['hamstrings'],
    equipment: 'barbell',
    equipmentDetail: 'バーベル / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-smith-hip-thrust',
    name: 'スミスマシンヒップスラスト',
    aliases: ['スミスヒップスラスト'],
    secondaryMuscles: ['hamstrings'],
    equipment: 'smithMachine',
    equipmentDetail: 'ヴァーティカルスミスマシン / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-hip-thrust',
    name: 'ダンベルヒップスラスト',
    aliases: ['ダンベルグルートブリッジ'],
    secondaryMuscles: ['hamstrings'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-glute-kickback',
    name: 'ケーブルグルートキックバック',
    aliases: ['ケーブルキックバック'],
    secondaryMuscles: ['hamstrings'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus / アンクルストラップ',
    loadType: 'weighted'
  }
])

const calves = group('calves', [
  {
    id: 'builtin-standing-dumbbell-calf-raise',
    name: 'ダンベルカーフレイズ',
    aliases: ['立ちカーフレイズ'],
    secondaryMuscles: [],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量）',
    loadType: 'weighted'
  },
  {
    id: 'builtin-smith-calf-raise',
    name: 'スミスマシンカーフレイズ',
    aliases: ['スミスカーフレイズ'],
    secondaryMuscles: [],
    equipment: 'smithMachine',
    equipmentDetail: 'ヴァーティカルスミスマシン',
    loadType: 'weighted'
  },
  {
    id: 'builtin-linear-leg-press-calf-raise',
    name: 'リニアレッグプレス・カーフレイズ',
    aliases: ['レッグプレスカーフレイズ'],
    secondaryMuscles: [],
    equipment: 'plateLoaded',
    equipmentDetail: 'Hammer Strength リニアレッグプレス',
    loadType: 'weighted'
  },
  {
    id: 'builtin-seated-dumbbell-calf-raise',
    name: 'シーテッドダンベルカーフレイズ',
    aliases: ['座りカーフレイズ'],
    secondaryMuscles: [],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-single-leg-calf-raise',
    name: 'シングルレッグカーフレイズ',
    aliases: ['片脚カーフレイズ'],
    secondaryMuscles: [],
    equipment: 'bodyweight',
    equipmentDetail: '自重・追加重量',
    loadType: 'bodyweightAdded'
  }
])

const core = group('core', [
  {
    id: 'builtin-insignia-abdominal',
    name: 'アブドミナル（Insignia）',
    aliases: ['マシンアブドミナル', '腹筋マシン'],
    secondaryMuscles: [],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia アブドミナル',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-crunch',
    name: 'ケーブルクランチ',
    aliases: ['ロープクランチ'],
    secondaryMuscles: [],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus / ロープ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-decline-crunch',
    name: 'デクラインクランチ',
    aliases: ['デクラインシットアップ'],
    secondaryMuscles: [],
    equipment: 'bodyweight',
    equipmentDetail: 'アジャスタブルデクラインベンチ',
    loadType: 'bodyweight'
  },
  {
    id: 'builtin-lying-leg-raise',
    name: 'レッグレイズ',
    aliases: ['ライイングレッグレイズ'],
    secondaryMuscles: [],
    equipment: 'bodyweight',
    equipmentDetail: 'レッグレイズ設備 / マット',
    loadType: 'bodyweight'
  },
  {
    id: 'builtin-hanging-knee-raise',
    name: 'ハンギングニーレイズ',
    aliases: ['ぶら下がり膝上げ'],
    secondaryMuscles: ['forearms'],
    equipment: 'bodyweight',
    equipmentDetail: 'レッグレイズ設備',
    loadType: 'bodyweight'
  },
  {
    id: 'builtin-hanging-leg-raise',
    name: 'ハンギングレッグレイズ',
    aliases: ['ぶら下がり脚上げ'],
    secondaryMuscles: ['forearms'],
    equipment: 'bodyweight',
    equipmentDetail: 'レッグレイズ設備',
    loadType: 'bodyweight'
  },
  {
    id: 'builtin-insignia-torso-rotation',
    name: 'トーソローテーション（Insignia）',
    aliases: ['ロータリートルソー', '体幹回旋'],
    secondaryMuscles: [],
    equipment: 'weightStack',
    equipmentDetail: 'Life Fitness Insignia トーソローテーション',
    loadType: 'weighted'
  },
  {
    id: 'builtin-cable-woodchop',
    name: 'ケーブルウッドチョップ',
    aliases: ['ウッドチョップ'],
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-pallof-press',
    name: 'パロフプレス',
    aliases: ['ケーブルパロフプレス'],
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    equipmentDetail: 'Matrix Connexus',
    loadType: 'weighted'
  },
  {
    id: 'builtin-back-extension',
    name: 'バックエクステンション',
    aliases: ['ハイパーエクステンション', '背筋'],
    secondaryMuscles: ['back', 'glutes', 'hamstrings'],
    equipment: 'bodyweight',
    equipmentDetail: 'バックエクステンションベンチ / 追加重量可',
    loadType: 'bodyweightAdded'
  }
])

const forearms = group('forearms', [
  {
    id: 'builtin-barbell-wrist-curl',
    name: 'バーベルリストカール',
    aliases: ['リストカール'],
    secondaryMuscles: [],
    equipment: 'barbell',
    equipmentDetail: 'バーベル / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-barbell-reverse-wrist-curl',
    name: 'バーベルリバースリストカール',
    aliases: ['リバースリストカール'],
    secondaryMuscles: [],
    equipment: 'barbell',
    equipmentDetail: 'バーベル / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-dumbbell-wrist-curl',
    name: 'ダンベルリストカール',
    aliases: ['DBリストカール'],
    secondaryMuscles: [],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / ベンチ',
    loadType: 'weighted'
  },
  {
    id: 'builtin-reverse-barbell-curl',
    name: 'リバースバーベルカール',
    aliases: ['リバースカール'],
    secondaryMuscles: ['biceps'],
    equipment: 'barbell',
    equipmentDetail: 'バーベル',
    loadType: 'weighted'
  },
  {
    id: 'builtin-farmers-walk-reps',
    name: 'ファーマーズウォーク（往復回数）',
    aliases: ['ファーマーズキャリー'],
    secondaryMuscles: ['shoulders', 'core'],
    equipment: 'dumbbell',
    equipmentDetail: 'ダンベル（片手重量） / 往復回数で記録',
    loadType: 'weighted'
  }
])

export const BUILT_IN_EXERCISES: readonly Exercise[] = [
  ...chest,
  ...back,
  ...shoulders,
  ...biceps,
  ...triceps,
  ...quadriceps,
  ...hamstrings,
  ...glutes,
  ...calves,
  ...core,
  ...forearms
].map(materialize)
