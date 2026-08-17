/** 潮生鎮誌 — 劇情與數值定義（純資料，可測）。 */

export const GAME_TITLE = "潮生鎮誌";
export const GAME_BRIEF =
  "你是外派記者，在潮生鎮停留七天。每日兩個時段安排行程：採訪鎮民、碼頭打工、探索舊街，或在市集備禮。對話與贈禮會改變好感；第七夜依羈絆與共同記憶，寫下不同的鎮誌結局。";

export const MAX_DAYS = 7;
export const SLOTS = ["morning", "afternoon"];
export const SLOT_LABEL = { morning: "上午", afternoon: "下午", evening: "入夜" };

export const CHARACTERS = {
  mira: {
    id: "mira",
    name: "美菈",
    role: "地方記者",
    color: "#ff8fab",
    portrait: "M",
    likes: ["sea", "photo"],
    intro: "她在舊報社整理退潮後才看得見的剪報。",
  },
  ren: {
    id: "ren",
    name: "阿任",
    role: "貨車司機",
    color: "#ffc971",
    portrait: "R",
    likes: ["family", "road"],
    intro: "父親留下的貨車仍停在港邊，車斗裡裝著半座鎮的回憶。",
  },
  yu: {
    id: "yu",
    name: "小雨",
    role: "鎮史館志工",
    color: "#7ec8e3",
    portrait: "Y",
    likes: ["archive", "festival"],
    intro: "她在關閉的鎮史館裡，替失蹤的祭典檔案編號。",
  },
};

export const LOCATIONS = {
  harbor: { name: "舊碼頭", icon: "⚓" },
  market: { name: "早市", icon: "🏮" },
  archive: { name: "鎮史館", icon: "📜" },
  hill: { name: "望海丘", icon: "🌊" },
  depot: { name: "貨運站", icon: "🚚" },
};

export const GIFTS = {
  shell_necklace: { name: "貝殼項鍊", cost: 5, icon: "🐚", bonus: { mira: 3 } },
  route_map: { name: "手繪路線圖", cost: 8, icon: "🗺", bonus: { ren: 3 } },
  old_film: { name: "舊底片筒", cost: 6, icon: "🎞", bonus: { yu: 3 } },
  harbor_tea: { name: "港邊茶葉", cost: 4, icon: "🍵", bonus: { ren: 2, mira: 1 } },
  press_badge: { name: "採訪證章", cost: 7, icon: "📛", bonus: { yu: 2, mira: 2 } },
};

export const SCHEDULE_ACTIONS = {
  visit_mira: { label: "採訪美菈", energy: 8, kind: "visit", who: "mira", place: "harbor" },
  visit_ren: { label: "跟阿任出車", energy: 10, kind: "visit", who: "ren", place: "depot" },
  visit_yu: { label: "幫小雨查檔", energy: 8, kind: "visit", who: "yu", place: "archive" },
  work: { label: "碼頭打工", energy: 15, kind: "work", place: "harbor" },
  explore: { label: "探索舊街", energy: 10, kind: "explore" },
  rest: { label: "回旅館休息", energy: -25, kind: "rest" },
  market: { label: "早市備禮", energy: 5, kind: "market", place: "market" },
};

/** 對話：依角色與 day 節奏；choices 影響好感與 flags。 */
export const DIALOGUES = {
  mira: [
    {
      minDay: 1,
      line: "退潮後的樁柱上還留著去年祭典的彩帶。你想先記什麼？",
      choices: [
        { text: "追問祭典為何停辦", flag: "festival_clue", affection: 2, memory: true },
        { text: "請她帶你看舊暗房", flag: "harbor_story", affection: 3, memory: true },
        { text: "只記下潮位數據", affection: 1 },
      ],
    },
    {
      minDay: 3,
      needs: ["harbor_story"],
      line: "她翻出父親拍的底片：「這張裡有個人，始終背對鏡頭。」",
      choices: [
        { text: "提議把底片交給小雨建檔", flag: "town_meeting", affection: 2, trust: 2 },
        { text: "建議先發地方報專題", affection: 3, memory: true },
        { text: "懷疑是炒作舊聞", affection: -2, trust: -1 },
      ],
    },
    {
      minDay: 5,
      line: "港務局要把舊報社改成倉儲。美菈問：「你的鎮誌，要給誰看？」",
      choices: [
        { text: "給離開的人看", affection: 2, flag: "harbor_story" },
        { text: "給留下的人看", affection: 3, trust: 2, memory: true },
        { text: "只給自己看", affection: -1 },
      ],
    },
  ],
  ren: [
    {
      minDay: 1,
      line: "阿任的貨車經過南迴公路，後斗裝著要送去各戶的雜貨。",
      choices: [
        { text: "問他父親為何不再出車", flag: "truck_story", affection: 3, memory: true },
        { text: "幫他整理送貨單", affection: 2, money: 2 },
        { text: "急著趕下一個採訪點", affection: -1 },
      ],
    },
    {
      minDay: 3,
      needs: ["truck_story"],
      line: "他在休息站拿出泛黃的口述筆記：「這些名字，再晚就沒人記得。」",
      choices: [
        { text: "提議跟車錄音", affection: 3, memory: true, flag: "town_meeting" },
        { text: "建議先整理成地圖", affection: 2, flag: "dock_rumor" },
        { text: "說口述不可信", affection: -3, trust: -2 },
      ],
    },
    {
      minDay: 5,
      line: "貨運站要改建成物流中心。阿任問：「公路以南的故事，還算這座鎮嗎？」",
      choices: [
        { text: "算，鎮的邊界在移動", affection: 3, trust: 1, memory: true },
        { text: "不算，但要寫進鎮誌", affection: 2, flag: "truck_story" },
        { text: "與你的稿無關", affection: -2 },
      ],
    },
  ],
  yu: [
    {
      minDay: 1,
      line: "鎮史館的索引卡缺了整整一格：一九八七年的迎王陣頭。",
      choices: [
        { text: "幫她比對舊報日期", flag: "festival_clue", affection: 3, memory: true },
        { text: "問缺檔是否人為", affection: 2, flag: "dock_rumor" },
        { text: "建議跳過缺失年份", affection: -2 },
      ],
    },
    {
      minDay: 3,
      needs: ["festival_clue"],
      line: "她在地下室找到半本點名簿，最後一頁被撕走。",
      choices: [
        { text: "聯絡美菈查報社備份", affection: 2, flag: "town_meeting", trust: 2 },
        { text: "請阿任問長輩口傳", affection: 2, memory: true },
        { text: "判定資料不足，暫停", affection: -1, trust: -1 },
      ],
    },
    {
      minDay: 5,
      line: "鎮公所要把史館改為遊客中心。小雨問：「誰有資格決定哪些記憶該被展示？」",
      choices: [
        { text: "應由鎮民共同決定", affection: 3, trust: 3, memory: true },
        { text: "應由檔案員決定", affection: 1 },
        { text: "誰出錢誰決定", affection: -3, trust: -2 },
      ],
    },
  ],
};

export const EXPLORE_EVENTS = [
  { text: "在防波堤聽見老漁夫談起失蹤的陣頭。", flag: "festival_clue", trust: 1 },
  { text: "舊街郵筒裡發現一張未寄出的路線圖。", flag: "dock_rumor", money: 2 },
  { text: "望海丘的風把旅館窗簾吹成旗幟，你記下這個開場。", memory: true, trust: 1 },
  { text: "早市攤販提起美菈父親的相機。", flag: "harbor_story", affection: { mira: 1 } },
  { text: "貨運站牆上塗鴉寫著南迴公里數。", flag: "truck_story", affection: { ren: 1 } },
];

export const ENDINGS = {
  mira: {
    phase: "won",
    title: "潮汐同行",
    text: "你與美菈接下地方報，把退潮後才看得見的故事印成週刊。鎮誌不再只是你的稿，而是港邊的燈。",
  },
  ren: {
    phase: "won",
    title: "公路以南",
    text: "你與阿任駕車採集口述史，把貨斗裡的名字寫進鎮誌。公路以南的里程，成為潮生鎮新的邊界。",
  },
  yu: {
    phase: "won",
    title: "未完檔案",
    text: "你與小雨重開鎮史館，把缺頁的迎王陣頭補上索引。鎮誌成為公開的檔案，等待下一位讀者。",
  },
  town: {
    phase: "won",
    title: "眾人的鎮誌",
    text: "你把採訪、路線與檔案合訂成鎮民共筆。沒有單一主角，但每個章節都有署名。",
  },
  leave: {
    phase: "won",
    title: "末班車",
    text: "你帶著未完稿離鎮。稿裡的空白處，留給下一班車上的讀者。",
  },
  burnout: {
    phase: "lost",
    title: "體力耗盡",
    text: "連日趕稿與奔波讓你病倒。編輯部收回採訪證，鎮誌停留在空白的第一頁。",
  },
  distrust: {
    phase: "lost",
    title: "閉鎖的鎮",
    text: "你的問題觸怒太多人。旅館老板遞來帳單，鎮民不再接受採訪。",
  },
  deadline: {
    phase: "lost",
    title: "截稿落空",
    text: "七天過去，你沒有足夠的材料交稿。潮生鎮的故事，仍散落在口耳之間。",
  },
};

export const AFFECTION_WIN = 10;
export const AFFECTION_TOWN = 6;
export const MEMORIES_TOWN = 5;
export const MEMORIES_LEAVE = 3;
export const MEMORIES_MIN = 2;
export const TRUST_FAIL = -4;
