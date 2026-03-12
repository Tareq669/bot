/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUT_PATH = path.join(__dirname, '..', 'src', 'content', 'questionSeeds.json');

const SOURCES = {
  religious: [
    'https://mawdoo3.com/أسئلة_دينية',
    'https://www.alukah.net/sharia/0/أسئلة/'
  ],
  science: [
    'https://mawdoo3.com/أسئلة_علمية',
    'https://www.thaqfya.com/scientific-questions/'
  ],
  history: [
    'https://mawdoo3.com/أسئلة_تاريخية',
    'https://www.thaqfya.com/history-questions/'
  ],
  geography: [
    'https://mawdoo3.com/أسئلة_جغرافية',
    'https://www.thaqfya.com/geography-questions/'
  ],
  physics: [
    'https://mawdoo3.com/أسئلة_فيزياء'
  ],
  calculations: [
    'https://mawdoo3.com/مسائل_حسابية',
    'https://www.thaqfya.com/math-questions/',
    'https://www.m3aarf.com/الغاز-رياضية'
  ],
  riddle: [
    'https://www.thaqfya.com/riddles/',
    'https://mawdoo3.com/ألغاز_مع_الحل'
  ],
  detective: [
    'https://www.thaqfya.com/detective-riddles/',
    'https://mawdoo3.com/ألغاز_بوليسية',
    'https://www.ts3a.com/ألغاز-بوليسية/'
  ]
};

const emptyBank = () => ({
  religious: [],
  science: [],
  history: [],
  fiqh: [],
  geography: [],
  physics: [],
  calculations: [],
  riddle: [],
  detective: []
});

const normalizeText = (s) => String(s || '')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const stripHtml = (html) => {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r/g, '\n');
};

const dedupeByQuestion = (items) => {
  const seen = new Set();
  const out = [];
  items.forEach((item) => {
    const key = normalizeText(item?.question).toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
};

const parseMcqLike = (text) => {
  const rows = [];
  const qaRegex = /(?:سؤال|س)\s*[:\-]?\s*([^؟\n]{6,180}\?)\s*(?:جواب|إجابة|الجواب|الإجابة|ج)\s*[:\-]?\s*([^\n\r\.\|]{1,140})/gmi;
  let m;
  while ((m = qaRegex.exec(text)) !== null) {
    const q = normalizeText(m[1]);
    const a = normalizeText(m[2]);
    if (!q || !a) continue;
    rows.push({
      question: q,
      answers: [a, 'لا أعلم', 'غير متأكد', 'لا شيء مما سبق'],
      correct: 0
    });
  }
  return dedupeByQuestion(rows);
};

const parseRiddleLike = (text) => {
  const rows = [];
  const qaRegex = /([^؟\n]{6,180}\?)\s*(?:الإجابة|الجواب|حل اللغز|الحل)\s*[:\-]?\s*([^\n\r\.\|]{1,140})/gmi;
  let m;
  while ((m = qaRegex.exec(text)) !== null) {
    const q = normalizeText(m[1]);
    const a = normalizeText(m[2]);
    if (!q || !a) continue;
    rows.push({ question: q, answers: [a] });
  }
  return dedupeByQuestion(rows);
};

const parseDetectiveLike = (text) => {
  const rows = [];
  const qaRegex = /([^؟\n]{8,220}\?)\s*(?:الإجابة|الجواب|الحل)\s*[:\-]?\s*([^\n\r\.\|]{1,160})/gmi;
  let m;
  while ((m = qaRegex.exec(text)) !== null) {
    const q = normalizeText(m[1]);
    const a = normalizeText(m[2]);
    if (!q || !a) continue;
    rows.push({
      question: q,
      options: [a, 'الاحتمال الأول', 'الاحتمال الثاني', 'الاحتمال الثالث', 'الاحتمال الرابع'],
      answerIndex: 0
    });
  }
  return dedupeByQuestion(rows);
};

const fetchUrl = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 20000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QuestionImporter/1.0)'
      }
    });
    return response.data;
  } catch (error) {
    console.warn(`WARN: failed ${url} -> ${error.message}`);
    return '';
  }
};

const loadExisting = () => {
  if (!fs.existsSync(OUT_PATH)) return emptyBank();
  try {
    const parsed = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    return { ...emptyBank(), ...parsed };
  } catch (_error) {
    return emptyBank();
  }
};

const main = async () => {
  const bank = loadExisting();

  for (const [category, urls] of Object.entries(SOURCES)) {
    let collected = [];
    for (const rawUrl of urls) {
      const url = encodeURI(rawUrl);
      const html = await fetchUrl(url);
      if (!html) continue;
      const text = stripHtml(html);
      if (category === 'riddle') {
        collected = collected.concat(parseRiddleLike(text));
      } else if (category === 'detective') {
        collected = collected.concat(parseDetectiveLike(text));
      } else {
        collected = collected.concat(parseMcqLike(text));
      }
    }
    bank[category] = dedupeByQuestion([...(bank[category] || []), ...collected]);
    console.log(`${category}: +${collected.length} (total ${bank[category].length})`);
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
  console.log(`Saved -> ${OUT_PATH}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

