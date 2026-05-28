// ==UserScript==
// @name         Syosetu Downloader (TXT + PDF)
// @name:ko      소설가가되자 다운로더 (TXT + PDF)
// @name:en      Syosetu Downloader (TXT + PDF)
// @name:ja      小説家になろうダウンローダー (TXT + PDF)
// @namespace    https://github.com/Lyre-04/Personal_project/
// @version      1.3.0
// @description     Download novels from 小説家になろう (syosetu) as TXT/PDF. Single/batch episodes, combined/individual files, selectable metadata. Ruby is unfolded as kanji(furigana). UI in Korean/English/Japanese.
// @description:ko  소설가가되자(syosetu)에서 소설을 TXT/PDF로 다운로드. 단일 화/전체 일괄, 통합/개별 파일, 메타데이터 선택 가능. 루비는 한자(후리가나) 형태. UI는 한국어/영어/일본어 지원.
// @description:en  Download novels from 小説家になろう (syosetu) as TXT/PDF. Single/batch episodes, combined/individual files, selectable metadata. Ruby is unfolded as kanji(furigana). UI in Korean/English/Japanese.
// @description:ja  小説家になろうの小説をTXT/PDFでダウンロード。単話・全話一括、統合・個別ファイル、メタデータ選択可能。ルビは漢字(ふりがな)形式で展開。UIは韓国語・英語・日本語に対応。
// @author       Lyre
// @match        https://ncode.syosetu.com/*
// @match        https://novel18.syosetu.com/*
// @icon         https://syosetu.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_download
// @grant        GM_addStyle
// @connect      ncode.syosetu.com
// @connect      novel18.syosetu.com
// @connect      api.syosetu.com
// @connect      fonts.gstatic.com
// @connect      cdn.jsdelivr.net
// @connect      raw.githubusercontent.com
// @connect      github.com
// @require      https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js
// @require      https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
// ==/UserScript==

(function () {
    'use strict';

    /* ============================================================
     * 설정
     * ============================================================ */
    const CONFIG = {
        EPISODE_DELAY_MS: 2000,
        BATCH_DOWNLOAD_DELAY_MS: 300,
        FONT_URL: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/google-fonts/NotoSansJP%5Bwght%5D.ttf',
        FONT_FILENAME: 'NotoSansJP-Regular.ttf',
        FONT_NAME: 'NotoSansJP',
        FONT_CACHE_KEY: 'noto_jp_font_base64_v2',
        FONT_CACHE_VERSION_KEY: 'noto_jp_font_version',
        FONT_VERSION: '2',
        PDF_FONT_SIZE: 11,
        PDF_LINE_HEIGHT: 1.7,
        PDF_MARGIN_MM: 18,
        // 사용자 설정 저장 키
        PREFS_KEY: 'sdl_user_prefs',
        LANG_KEY: 'sdl_ui_lang',
    };

    /* ============================================================
     * i18n: UI 다국어 사전 (출력 파일 내 메타데이터는 항상 일본어)
     * ============================================================ */
    const I18N = {
        ko: {
            // 패널
            panelTitle: 'Syosetu Downloader',
            language: '언어',
            scope: '범위',
            structure: '구조',
            scopeCurrent: '현재 에피소드만',
            scopeAll: '전체 일괄',
            structCombined: '통합 1개 파일',
            structIndividual: '에피소드별 (ZIP)',
            // 메타데이터 섹션
            metaSection: '메타데이터 선택',
            groupDate: '날짜',
            groupWork: '작품 정보',
            groupEpisode: '에피소드 정보',
            groupBody: '본문 부속',
            metaFirstup: '게재일',
            metaLastup: '수정일',
            metaDownloaded: '다운로드일',
            metaTitle: '작품 제목',
            metaAuthor: '작가명',
            metaIntro: '줄거리',
            metaChapter: '챕터 제목',
            metaEpNo: '화 번호',
            metaSubtitle: '부제',
            metaPreface: '작가의 말(서두)',
            metaAfterword: '작가의 말(후기)',
            presetDefault: '기본',
            presetAll: '전체',
            presetNone: '해제',
            presetTranslate: '번역용',
            // 버튼/상태
            run: '다운로드 시작',
            running: '작업 중...',
            ready: '준비 완료',
            statusFetchToc: '목차 정보 가져오는 중...',
            statusFetchEp: (n, total) => `수집 중: ${n}/${total}화`,
            statusExtractEp: (no) => `${no}화 추출 중...`,
            statusSaveTxt: 'TXT 저장 중...',
            statusBuildPdf: 'PDF 생성 중...',
            statusBuildCombinedTxt: '통합 TXT 저장 중...',
            statusBuildCombinedPdf: '통합 PDF 생성 중 (시간이 걸릴 수 있습니다)...',
            statusBuildPdfNum: (n, total) => `PDF 생성 중: ${n}/${total}`,
            statusZipping: 'ZIP 압축 중...',
            statusDone: '완료',
            statusDoneAll: (n) => `완료: 총 ${n}화`,
            statusError: (msg) => `오류: ${msg}`,
            statusFontDownload: '일본어 폰트(TTF, 약 9.5MB) 다운로드 중... (최초 1회만)',
            statusFontEncode: '폰트 base64 인코딩 중...',
            // 알림
            alertNotEpisode: '현재 페이지는 에피소드 페이지가 아닙니다.',
            alertNoEpisodes: '에피소드를 찾을 수 없습니다.',
            alertNoFormat: 'TXT 또는 PDF 중 최소 하나는 선택해주세요.',
        },
        en: {
            panelTitle: 'Syosetu Downloader',
            language: 'Language',
            scope: 'Scope',
            structure: 'Structure',
            scopeCurrent: 'Current episode only',
            scopeAll: 'All episodes',
            structCombined: 'Combined (1 file)',
            structIndividual: 'Per episode (ZIP)',
            metaSection: 'Metadata Selection',
            groupDate: 'Date',
            groupWork: 'Work Info',
            groupEpisode: 'Episode Info',
            groupBody: 'Body Attachments',
            metaFirstup: 'Posted date',
            metaLastup: 'Updated date',
            metaDownloaded: 'Downloaded date',
            metaTitle: 'Title',
            metaAuthor: 'Author',
            metaIntro: 'Synopsis',
            metaChapter: 'Chapter title',
            metaEpNo: 'Episode no.',
            metaSubtitle: 'Subtitle',
            metaPreface: "Author's preface",
            metaAfterword: "Author's afterword",
            presetDefault: 'Default',
            presetAll: 'All',
            presetNone: 'None',
            presetTranslate: 'For TL',
            run: 'Start Download',
            running: 'Working...',
            ready: 'Ready',
            statusFetchToc: 'Fetching table of contents...',
            statusFetchEp: (n, total) => `Fetching: ${n}/${total}`,
            statusExtractEp: (no) => `Extracting episode ${no}...`,
            statusSaveTxt: 'Saving TXT...',
            statusBuildPdf: 'Generating PDF...',
            statusBuildCombinedTxt: 'Saving combined TXT...',
            statusBuildCombinedPdf: 'Generating combined PDF (this may take a while)...',
            statusBuildPdfNum: (n, total) => `Generating PDF: ${n}/${total}`,
            statusZipping: 'Compressing ZIP...',
            statusDone: 'Done',
            statusDoneAll: (n) => `Done: ${n} episodes`,
            statusError: (msg) => `Error: ${msg}`,
            statusFontDownload: 'Downloading Japanese font (TTF, ~9.5MB)... (first run only)',
            statusFontEncode: 'Encoding font to base64...',
            alertNotEpisode: 'This is not an episode page.',
            alertNoEpisodes: 'No episodes found.',
            alertNoFormat: 'Please select at least TXT or PDF.',
        },
        ja: {
            panelTitle: 'Syosetu Downloader',
            language: '言語',
            scope: '範囲',
            structure: '構造',
            scopeCurrent: '現エピソードのみ',
            scopeAll: '全話一括',
            structCombined: '統合1ファイル',
            structIndividual: '話別個別 (ZIP)',
            metaSection: 'メタデータ選択',
            groupDate: '日付',
            groupWork: '作品情報',
            groupEpisode: 'エピソード情報',
            groupBody: '本文付属',
            metaFirstup: '掲載日',
            metaLastup: '更新日',
            metaDownloaded: 'ダウンロード日',
            metaTitle: '作品タイトル',
            metaAuthor: '作者名',
            metaIntro: 'あらすじ',
            metaChapter: '章タイトル',
            metaEpNo: '話番号',
            metaSubtitle: 'サブタイトル',
            metaPreface: '前書き',
            metaAfterword: '後書き',
            presetDefault: '既定',
            presetAll: '全選択',
            presetNone: '全解除',
            presetTranslate: '翻訳用',
            run: 'ダウンロード開始',
            running: '作業中...',
            ready: '準備完了',
            statusFetchToc: '目次情報を取得中...',
            statusFetchEp: (n, total) => `取得中: ${n}/${total}話`,
            statusExtractEp: (no) => `第${no}話を抽出中...`,
            statusSaveTxt: 'TXT保存中...',
            statusBuildPdf: 'PDF生成中...',
            statusBuildCombinedTxt: '統合TXT保存中...',
            statusBuildCombinedPdf: '統合PDF生成中(時間がかかる場合があります)...',
            statusBuildPdfNum: (n, total) => `PDF生成中: ${n}/${total}`,
            statusZipping: 'ZIP圧縮中...',
            statusDone: '完了',
            statusDoneAll: (n) => `完了: 全${n}話`,
            statusError: (msg) => `エラー: ${msg}`,
            statusFontDownload: '日本語フォント(TTF, 約9.5MB)をダウンロード中... (初回のみ)',
            statusFontEncode: 'フォントをbase64エンコード中...',
            alertNotEpisode: '現在のページはエピソードページではありません。',
            alertNoEpisodes: 'エピソードが見つかりません。',
            alertNoFormat: 'TXTまたはPDFを少なくとも一つ選択してください。',
        },
    };

    const LANGUAGES = [
        { code: 'ko', label: '한국어' },
        { code: 'en', label: 'English' },
        { code: 'ja', label: '日本語' },
    ];

    function detectDefaultLang() {
        const saved = GM_getValue(CONFIG.LANG_KEY, null);
        if (saved && I18N[saved]) return saved;
        // 브라우저 언어 감지
        const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        if (nav.startsWith('ko')) return 'ko';
        if (nav.startsWith('ja')) return 'ja';
        return 'en';
    }

    let CURRENT_LANG = detectDefaultLang();

    function t(key, ...args) {
        const dict = I18N[CURRENT_LANG] || I18N.en;
        const val = dict[key];
        if (typeof val === 'function') return val(...args);
        if (val === undefined) return I18N.en[key] !== undefined ? I18N.en[key] : key;
        return val;
    }

    function setLang(code) {
        if (!I18N[code]) return;
        CURRENT_LANG = code;
        GM_setValue(CONFIG.LANG_KEY, code);
    }

    // 메타데이터 옵션 정의 (key, labelKey: i18n 키, default, group)
    const META_OPTIONS = [
        { key: 'firstup',     labelKey: 'metaFirstup',    def: true,  group: 'date' },
        { key: 'lastup',      labelKey: 'metaLastup',     def: true,  group: 'date' },
        { key: 'downloaded',  labelKey: 'metaDownloaded', def: true,  group: 'date' },
        { key: 'title',       labelKey: 'metaTitle',      def: true,  group: 'work' },
        { key: 'author',      labelKey: 'metaAuthor',     def: true,  group: 'work' },
        { key: 'intro',       labelKey: 'metaIntro',      def: false, group: 'work' },
        { key: 'chapter',     labelKey: 'metaChapter',    def: false, group: 'episode' },
        { key: 'epNo',        labelKey: 'metaEpNo',       def: false, group: 'episode' },
        { key: 'subtitle',    labelKey: 'metaSubtitle',   def: true,  group: 'episode' },
        { key: 'preface',     labelKey: 'metaPreface',    def: false, group: 'body' },
        { key: 'afterword',   labelKey: 'metaAfterword',  def: false, group: 'body' },
    ];

    function defaultPrefs() {
        const obj = {};
        META_OPTIONS.forEach(o => { obj[o.key] = o.def; });
        return obj;
    }

    function loadPrefs() {
        try {
            const saved = GM_getValue(CONFIG.PREFS_KEY, null);
            if (!saved) return defaultPrefs();
            const def = defaultPrefs();
            return Object.assign(def, saved);
        } catch (e) {
            return defaultPrefs();
        }
    }

    function savePrefs(prefs) {
        try { GM_setValue(CONFIG.PREFS_KEY, prefs); } catch (e) {}
    }

    /* ============================================================
     * URL 판별
     * ============================================================ */
    const URLInfo = {
        getNcode() {
            const m = location.pathname.match(/^\/(n[0-9a-z]+)\//i);
            return m ? m[1].toLowerCase() : null;
        },
        getEpisodeNo() {
            const m = location.pathname.match(/^\/n[0-9a-z]+\/(\d+)\/?$/i);
            return m ? parseInt(m[1], 10) : null;
        },
        isTocPage() {
            return /^\/n[0-9a-z]+\/?$/i.test(location.pathname);
        },
        isEpisodePage() {
            return this.getEpisodeNo() !== null;
        },
    };

    /* ============================================================
     * HTML → 텍스트 (루비 한자(후리가나) 형태)
     * ============================================================ */
    function nodeToText(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName.toLowerCase();

        if (tag === 'ruby') {
            const rbParts = [];
            const rtParts = [];
            for (const child of node.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    rbParts.push(child.textContent);
                    continue;
                }
                if (child.nodeType !== Node.ELEMENT_NODE) continue;
                const childTag = child.tagName.toLowerCase();
                if (childTag === 'rb') rbParts.push(child.textContent);
                else if (childTag === 'rt') rtParts.push(child.textContent);
            }
            const base = rbParts.join('').trim();
            const ruby = rtParts.join('').trim();
            if (base && ruby) return `${base}(${ruby})`;
            return base || ruby;
        }

        if (tag === 'br') return '\n';
        if (tag === 'rp' || tag === 'rt') return '';

        let out = '';
        for (const child of node.childNodes) out += nodeToText(child);
        if (['p', 'div'].includes(tag)) out += '\n';
        return out;
    }

    function extractTextFromContainer(container) {
        if (!container) return '';
        let text = nodeToText(container);
        text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        return text;
    }

    /* ============================================================
     * 날짜 추출 유틸
     * ============================================================ */
    function extractEpisodeDates(doc) {
        // syosetu의 에피소드 페이지 하단/상단에 게재일/수정일 표시
        // 신 레이아웃: <div class="p-novel__date">YYYY/MM/DD HH:MM 投稿</div>
        //              <div class="p-novel__date">YYYY/MM/DD HH:MM 改稿</div>
        // 또는 <p class="novel_subtitle"> 근처
        const result = { firstup: '', lastup: '' };

        // 신 레이아웃
        const dateEls = doc.querySelectorAll('.p-novel__date, .novel_view_date');
        dateEls.forEach(el => {
            const text = el.textContent.trim();
            // "2024/01/15 10:30 投稿"
            // "改稿日：2024/03/20 14:22"
            const m = text.match(/(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})/);
            if (!m) return;
            const dateStr = m[1];
            if (text.includes('改稿') || text.includes('修正') || text.includes('更新')) {
                result.lastup = dateStr;
            } else if (text.includes('投稿') || text.includes('掲載')) {
                result.firstup = dateStr;
            } else if (!result.firstup) {
                result.firstup = dateStr;
            }
        });

        // 둘 다 못 찾으면 title 속성에서 시도 (목차 페이지에서 가져온 정보 활용)
        return result;
    }

    /* ============================================================
     * 본문 추출
     * ============================================================ */
    function parseEpisodeDoc(doc) {
        const preface = doc.querySelector('.js-novel-text.p-novel__text--preface, .p-novel__text--preface');
        const body = doc.querySelector('.js-novel-text.p-novel__text:not(.p-novel__text--preface):not(.p-novel__text--afterword), #novel_honbun');
        const afterword = doc.querySelector('.js-novel-text.p-novel__text--afterword, .p-novel__text--afterword');

        const subtitleEl = doc.querySelector('.p-novel__title--rensai, .p-novel__title, .novel_subtitle');
        const subtitle = (subtitleEl ? subtitleEl.textContent : '').trim();

        const dates = extractEpisodeDates(doc);

        return {
            subtitle,
            preface: extractTextFromContainer(preface),
            body: extractTextFromContainer(body),
            afterword: extractTextFromContainer(afterword),
            firstup: dates.firstup,
            lastup: dates.lastup,
        };
    }

    function parseTocDoc(doc) {
        // 작품 제목
        const titleEl = doc.querySelector('.p-novel__title, .novel_title');
        const title = (titleEl ? titleEl.textContent : '').trim();

        // 작가
        const authorEl = doc.querySelector('.p-novel__author a, .p-novel__author, .novel_writername a, .novel_writername');
        let author = (authorEl ? authorEl.textContent : '').trim();
        author = author.replace(/^作者[：:]\s*/, '');

        // 줄거리
        const introEl = doc.querySelector('.p-novel__summary, #novel_ex');
        const intro = extractTextFromContainer(introEl);

        // 에피소드 목록 (chapter 정보 + 게재일/수정일 포함)
        const episodes = [];
        const root = doc.querySelector('.p-eplist, .index_box') || doc.body;
        if (root) {
            let currentChapter = null;
            // chapter, episode item을 DOM 순서대로 순회
            const walker = root.querySelectorAll(
                '.p-eplist__chapter-title, .chapter_title, ' +
                '.p-eplist__sublist, .novel_sublist2'
            );
            walker.forEach(el => {
                if (el.classList.contains('p-eplist__chapter-title') || el.classList.contains('chapter_title')) {
                    currentChapter = el.textContent.trim();
                    return;
                }
                // 에피소드 항목
                const link = el.querySelector('a');
                if (!link) return;
                const href = link.getAttribute('href') || '';
                const m = href.match(/\/n[0-9a-z]+\/(\d+)\/?$/i);
                if (!m) return;

                // 게재일/수정일 - 신 레이아웃은 .p-eplist__update, 구 레이아웃은 .long_update
                let firstup = '';
                let lastup = '';
                const dateEl = el.querySelector('.p-eplist__update, .long_update, dt.long_update');
                if (dateEl) {
                    const dateText = dateEl.textContent.trim();
                    // 형식 예시: "2024/01/15 10:30 (改: 2024/03/20 14:22)"
                    // 또는 <span title="2024/03/20 14:22 改稿">2024/01/15 10:30</span>
                    const allDates = dateText.match(/\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}/g) || [];
                    if (allDates.length >= 1) firstup = allDates[0];
                    if (allDates.length >= 2) lastup = allDates[1];

                    // span title 속성 추가 확인
                    const titleSpan = dateEl.querySelector('span[title*="改"]');
                    if (titleSpan) {
                        const tm = titleSpan.getAttribute('title').match(/(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})/);
                        if (tm) lastup = tm[1];
                    }
                }
                if (!lastup) lastup = firstup; // 수정 없으면 게재일과 동일

                episodes.push({
                    no: parseInt(m[1], 10),
                    subtitle: link.textContent.trim(),
                    chapter: currentChapter,
                    firstup,
                    lastup,
                });
            });
        }

        // 폴백: 위 방식 실패 시 단순 a 태그 수집
        if (episodes.length === 0) {
            const links = doc.querySelectorAll('.p-eplist__sublist a, .novel_sublist2 a, dl.novel_sublist2 dd.subtitle a');
            links.forEach(el => {
                const href = el.getAttribute('href') || '';
                const m = href.match(/\/n[0-9a-z]+\/(\d+)\/?$/i);
                if (m) {
                    episodes.push({
                        no: parseInt(m[1], 10),
                        subtitle: el.textContent.trim(),
                        chapter: null,
                        firstup: '',
                        lastup: '',
                    });
                }
            });
        }

        return { title, author, intro, episodes };
    }

    /* ============================================================
     * 네트워크
     * ============================================================ */
    function gmFetchDoc(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        const parser = new DOMParser();
                        resolve(parser.parseFromString(res.responseText, 'text/html'));
                    } else reject(new Error(`HTTP ${res.status} for ${url}`));
                },
                onerror: (err) => reject(err),
                ontimeout: () => reject(new Error(`Timeout: ${url}`)),
                timeout: 30000,
            });
        });
    }

    function gmFetchArrayBuffer(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url, responseType: 'arraybuffer',
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) resolve(res.response);
                    else reject(new Error(`HTTP ${res.status}`));
                },
                onerror: (err) => reject(err),
                ontimeout: () => reject(new Error('Timeout')),
                timeout: 120000,
            });
        });
    }

    /* ============================================================
     * 폰트 캐싱
     * ============================================================ */
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    }

    async function loadJapaneseFont() {
        const cachedVersion = GM_getValue(CONFIG.FONT_CACHE_VERSION_KEY, null);
        if (cachedVersion === CONFIG.FONT_VERSION) {
            const cached = GM_getValue(CONFIG.FONT_CACHE_KEY, null);
            if (cached) return cached;
        }
        logStatus(t('statusFontDownload'));
        const buffer = await gmFetchArrayBuffer(CONFIG.FONT_URL);
        logStatus(t('statusFontEncode'));
        const base64 = arrayBufferToBase64(buffer);
        try {
            GM_setValue(CONFIG.FONT_CACHE_KEY, base64);
            GM_setValue(CONFIG.FONT_CACHE_VERSION_KEY, CONFIG.FONT_VERSION);
        } catch (e) {
            console.warn('[SDL] 폰트 캐시 저장 실패:', e);
        }
        return base64;
    }

    /* ============================================================
     * 파일명, 날짜 포맷
     * ============================================================ */
    function sanitizeFilename(name) {
        return (name || 'untitled')
            .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 100);
    }

    function padNo(n, total) {
        const width = String(total).length;
        return String(n).padStart(width, '0');
    }

    function nowString() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    /* ============================================================
     * 메타데이터 헤더 생성 (TXT)
     * ============================================================ */
    /**
     * 최상단 일자 블록 빌더
     * @param {{firstup?:string, lastup?:string}} dates
     * @param {object} prefs - 선택된 메타데이터
     * @returns {string[]} 줄 배열
     */
    function buildDateHeader(dates, prefs) {
        const lines = [];
        const dateLineParts = [];
        if (prefs.firstup && dates.firstup) dateLineParts.push(`掲載日: ${dates.firstup}`);
        if (prefs.lastup && dates.lastup) dateLineParts.push(`更新日: ${dates.lastup}`);
        if (dateLineParts.length) lines.push(dateLineParts.join(' / '));
        if (prefs.downloaded) lines.push(`ダウンロード日: ${nowString()}`);
        return lines;
    }

    /**
     * 작품 정보 블록 빌더
     */
    function buildWorkBlock(meta, prefs) {
        const lines = [];
        if (prefs.title && meta.title) lines.push(`【${meta.title}】`);
        if (prefs.author && meta.author) lines.push(`作者: ${meta.author}`);
        if (prefs.intro && meta.intro) {
            lines.push('');
            lines.push('■あらすじ');
            lines.push(meta.intro);
        }
        return lines;
    }

    /**
     * 에피소드 정보 블록 빌더
     */
    function buildEpisodeInfoBlock(ep, prefs, opts = {}) {
        // opts.includeDates: 에피소드 내부에 게재일/수정일 다시 표시 여부 (일괄 통합 파일에서 사용)
        const lines = [];
        if (opts.includeDates) {
            const parts = [];
            if (prefs.firstup && ep.firstup) parts.push(`掲載日: ${ep.firstup}`);
            if (prefs.lastup && ep.lastup) parts.push(`更新日: ${ep.lastup}`);
            if (parts.length) lines.push(parts.join(' / '));
        }
        if (prefs.chapter && ep.chapter) lines.push(`章: ${ep.chapter}`);
        const titleParts = [];
        if (prefs.epNo) titleParts.push(`第${ep.no}話`);
        if (prefs.subtitle && ep.subtitle) titleParts.push(ep.subtitle);
        if (titleParts.length) lines.push(titleParts.join(': '));
        return lines;
    }

    /* ============================================================
     * TXT 빌더
     * ============================================================ */
    function buildEpisodeText(meta, ep, prefs) {
        const sections = [];

        // 1. 최상단 일자 블록 (게재일/수정일/다운로드일)
        const dateHeader = buildDateHeader({ firstup: ep.firstup, lastup: ep.lastup }, prefs);
        if (dateHeader.length) {
            sections.push(dateHeader.join('\n'));
        }

        // 2. 작품 정보
        const workBlock = buildWorkBlock(meta, prefs);
        if (workBlock.length) sections.push(workBlock.join('\n'));

        // 3. 에피소드 정보 (날짜 제외 - 이미 최상단에 있음)
        const epInfo = buildEpisodeInfoBlock(ep, prefs, { includeDates: false });
        if (epInfo.length) sections.push(epInfo.join('\n'));

        // 4. 본문 부속 + 본문
        const bodyParts = [];
        if (prefs.preface && ep.preface) {
            bodyParts.push(`〈作者からの前書き〉\n${ep.preface}\n${'-'.repeat(40)}`);
        }
        bodyParts.push(ep.body || '(本文なし)');
        if (prefs.afterword && ep.afterword) {
            bodyParts.push(`${'-'.repeat(40)}\n〈作者からの後書き〉\n${ep.afterword}`);
        }
        sections.push(bodyParts.join('\n\n'));

        return sections.join('\n\n');
    }

    function buildCombinedText(meta, episodes, prefs) {
        // 작품 전체 기준: 최초 게재일~최종 수정일
        const allFirstups = episodes.map(e => e.firstup).filter(Boolean).sort();
        const allLastups = episodes.map(e => e.lastup).filter(Boolean).sort();
        const workDates = {
            firstup: allFirstups[0] || '',
            lastup: allLastups[allLastups.length - 1] || '',
        };

        const sections = [];
        const dateHeader = buildDateHeader(workDates, prefs);
        if (dateHeader.length) sections.push(dateHeader.join('\n'));

        const workBlock = buildWorkBlock(meta, prefs);
        if (workBlock.length) sections.push(workBlock.join('\n'));

        // 총 화수 표시 (제목/작가 표시되어 있을 때만 의미가 있어 함께)
        if (prefs.title || prefs.author) {
            sections.push(`総話数: ${episodes.length}`);
        }

        sections.push('='.repeat(60));

        // 각 에피소드 (에피소드 내부에는 게재일/수정일 표시)
        const epTexts = episodes.map(ep => {
            const epSections = [];
            const epInfo = buildEpisodeInfoBlock(ep, prefs, { includeDates: true });
            if (epInfo.length) epSections.push(epInfo.join('\n'));

            const bodyParts = [];
            if (prefs.preface && ep.preface) {
                bodyParts.push(`〈作者からの前書き〉\n${ep.preface}\n${'-'.repeat(40)}`);
            }
            bodyParts.push(ep.body || '(本文なし)');
            if (prefs.afterword && ep.afterword) {
                bodyParts.push(`${'-'.repeat(40)}\n〈作者からの後書き〉\n${ep.afterword}`);
            }
            epSections.push(bodyParts.join('\n\n'));
            return epSections.join('\n\n');
        });

        sections.push(epTexts.join('\n\n' + '='.repeat(60) + '\n\n'));
        return sections.join('\n\n');
    }

    /* ============================================================
     * PDF 빌더
     * ============================================================ */
    async function ensureJsPDFFont(doc) {
        const base64 = await loadJapaneseFont();
        doc.addFileToVFS(CONFIG.FONT_FILENAME, base64);
        doc.addFont(CONFIG.FONT_FILENAME, CONFIG.FONT_NAME, 'normal');
    }

    async function buildPDF(titleForPdf, text) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
        await ensureJsPDFFont(doc);
        doc.setFont(CONFIG.FONT_NAME, 'normal');
        doc.setFontSize(CONFIG.PDF_FONT_SIZE);

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = CONFIG.PDF_MARGIN_MM;
        const usableWidth = pageWidth - margin * 2;
        const lineHeight = CONFIG.PDF_FONT_SIZE * CONFIG.PDF_LINE_HEIGHT * 0.3528;

        let y = margin;

        if (titleForPdf) {
            doc.setFontSize(16);
            const titleLines = doc.splitTextToSize(titleForPdf, usableWidth);
            titleLines.forEach(line => {
                if (y > pageHeight - margin) { doc.addPage(); y = margin; }
                doc.text(line, margin, y);
                y += 8;
            });
            y += 4;
            doc.setFontSize(CONFIG.PDF_FONT_SIZE);
        }

        const paragraphs = text.split('\n');
        for (const para of paragraphs) {
            if (para.trim() === '') { y += lineHeight * 0.6; continue; }
            const lines = doc.splitTextToSize(para, usableWidth);
            for (const line of lines) {
                if (y > pageHeight - margin) { doc.addPage(); y = margin; }
                doc.text(line, margin, y);
                y += lineHeight;
            }
        }

        return doc.output('blob');
    }

    /* ============================================================
     * 다운로드 / Sleep
     * ============================================================ */
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    }

    function downloadText(text, filename) {
        downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename);
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    /* ============================================================
     * fetch 흐름
     * ============================================================ */
    async function fetchEpisode(ncode, no) {
        const url = `${location.origin}/${ncode}/${no}/`;
        const doc = await gmFetchDoc(url);
        const parsed = parseEpisodeDoc(doc);
        return { no, ...parsed };
    }

    async function fetchToc(ncode) {
        const doc = await gmFetchDoc(`${location.origin}/${ncode}/`);
        return parseTocDoc(doc);
    }

    /* ============================================================
     * 메인 작업 흐름
     * ============================================================ */
    async function doCurrentEpisode(formats, prefs) {
        const ncode = URLInfo.getNcode();
        const no = URLInfo.getEpisodeNo();
        if (!no) { alert(t('alertNotEpisode')); return; }

        logStatus(t('statusFetchToc'));
        const toc = await fetchToc(ncode);

        logStatus(t('statusExtractEp', no));
        const ep = parseEpisodeDoc(document);
        ep.no = no;

        // 목차에서 chapter, 날짜 정보 보강
        const tocEp = toc.episodes.find(e => e.no === no);
        if (tocEp) {
            ep.chapter = tocEp.chapter;
            if (!ep.firstup) ep.firstup = tocEp.firstup;
            if (!ep.lastup) ep.lastup = tocEp.lastup;
            if (!ep.subtitle) ep.subtitle = tocEp.subtitle;
        }
        if (!ep.lastup) ep.lastup = ep.firstup;

        const meta = { title: toc.title, author: toc.author, intro: toc.intro };
        const text = buildEpisodeText(meta, ep, prefs);

        const titlePart = sanitizeFilename(meta.title);
        const subPart = sanitizeFilename(ep.subtitle || `第${no}話`);
        const baseName = `${titlePart}_${padNo(no, toc.episodes.length || no)}_${subPart}`;

        const pdfTitle = (prefs.title ? meta.title : '') +
                         ((prefs.title && (prefs.epNo || prefs.subtitle)) ? ' - ' : '') +
                         (prefs.epNo ? `第${no}話` : '') +
                         ((prefs.epNo && prefs.subtitle && ep.subtitle) ? ': ' : '') +
                         (prefs.subtitle ? (ep.subtitle || '') : '');

        if (formats.txt) {
            logStatus(t('statusSaveTxt'));
            downloadText(text, baseName + '.txt');
            await sleep(CONFIG.BATCH_DOWNLOAD_DELAY_MS);
        }
        if (formats.pdf) {
            logStatus(t('statusBuildPdf'));
            const blob = await buildPDF(pdfTitle.trim(), text);
            downloadBlob(blob, baseName + '.pdf');
        }
        logStatus(t('statusDone'), 'success');
    }

    async function doAllEpisodes(formats, structure, prefs) {
        const ncode = URLInfo.getNcode();
        logStatus(t('statusFetchToc'));
        const toc = await fetchToc(ncode);
        if (toc.episodes.length === 0) {
            alert(t('alertNoEpisodes')); return;
        }
        const total = toc.episodes.length;
        const fetched = [];

        for (let i = 0; i < toc.episodes.length; i++) {
            const e = toc.episodes[i];
            logStatus(t('statusFetchEp', i + 1, total) + ` (第${e.no}話)`);
            try {
                const epData = await fetchEpisode(ncode, e.no);
                epData.chapter = e.chapter;
                if (!epData.subtitle) epData.subtitle = e.subtitle;
                if (!epData.firstup) epData.firstup = e.firstup;
                if (!epData.lastup) epData.lastup = e.lastup || e.firstup;
                fetched.push(epData);
            } catch (err) {
                console.error(`Episode ${e.no} fetch failed:`, err);
                fetched.push({
                    no: e.no, subtitle: e.subtitle, chapter: e.chapter,
                    firstup: e.firstup, lastup: e.lastup,
                    preface: '', body: `(取得失敗: ${err.message})`, afterword: '',
                });
            }
            if (i < toc.episodes.length - 1) await sleep(CONFIG.EPISODE_DELAY_MS);
        }

        const meta = { title: toc.title, author: toc.author, intro: toc.intro };

        if (structure === 'combined') {
            const fullText = buildCombinedText(meta, fetched, prefs);
            const baseName = `${sanitizeFilename(meta.title)}_全${total}話`;
            if (formats.txt) {
                logStatus(t('statusBuildCombinedTxt'));
                downloadText(fullText, baseName + '.txt');
                await sleep(CONFIG.BATCH_DOWNLOAD_DELAY_MS);
            }
            if (formats.pdf) {
                logStatus(t('statusBuildCombinedPdf'));
                const blob = await buildPDF(prefs.title ? meta.title : '', fullText);
                downloadBlob(blob, baseName + '.pdf');
            }
        } else {
            const zip = new JSZip();
            for (const ep of fetched) {
                const baseName = `${padNo(ep.no, total)}_${sanitizeFilename(ep.subtitle || `第${ep.no}話`)}`;
                const text = buildEpisodeText(meta, ep, prefs);
                if (formats.txt) zip.file(baseName + '.txt', text);
                if (formats.pdf) {
                    logStatus(t('statusBuildPdfNum', ep.no, total));
                    const pdfTitle = (prefs.title ? meta.title : '') +
                                     ((prefs.title && (prefs.epNo || prefs.subtitle)) ? ' - ' : '') +
                                     (prefs.epNo ? `第${ep.no}話` : '') +
                                     ((prefs.epNo && prefs.subtitle && ep.subtitle) ? ': ' : '') +
                                     (prefs.subtitle ? (ep.subtitle || '') : '');
                    const blob = await buildPDF(pdfTitle.trim(), text);
                    zip.file(baseName + '.pdf', blob);
                }
            }
            logStatus(t('statusZipping'));
            const zipBlob = await zip.generateAsync({
                type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }
            });
            downloadBlob(zipBlob, `${sanitizeFilename(meta.title)}_全${total}話.zip`);
        }

        logStatus(t('statusDoneAll', total), 'success');
    }

    /* ============================================================
     * UI 패널
     * ============================================================ */
    GM_addStyle(`
        #sdl-panel {
            position: fixed; bottom: 24px; right: 24px; z-index: 999999;
            background: #1a1a1a; color: #eee;
            border: 1px solid #3a3a3a; border-radius: 10px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif;
            font-size: 13px; padding: 14px 16px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            width: 320px; max-height: calc(100vh - 60px); overflow-y: auto;
        }
        #sdl-panel.collapsed { width: auto; padding: 8px 12px; }
        #sdl-panel h4 {
            margin: 0 0 10px 0; font-size: 13px; font-weight: 600;
            color: #fff; display: flex; justify-content: space-between; align-items: center;
        }
        #sdl-panel .sdl-row { margin: 6px 0; display: flex; align-items: center; gap: 8px; }
        #sdl-panel .sdl-row > label { color: #bbb; flex-shrink: 0; min-width: 72px; }
        #sdl-panel select {
            flex: 1; background: #2a2a2a; color: #eee; border: 1px solid #444;
            padding: 4px 6px; border-radius: 4px; font-size: 12px;
        }
        #sdl-panel .sdl-formats { display: flex; gap: 12px; }
        #sdl-panel .sdl-formats label {
            min-width: 0; color: #ddd; cursor: pointer; display: flex; align-items: center; gap: 4px;
        }
        #sdl-meta-section {
            margin-top: 8px; border-top: 1px solid #333; padding-top: 8px;
        }
        #sdl-meta-section .sdl-meta-header {
            display: flex; justify-content: space-between; align-items: center;
            color: #bbb; font-size: 11px; margin-bottom: 6px; cursor: pointer;
            user-select: none;
        }
        #sdl-meta-section .sdl-meta-header:hover { color: #fff; }
        #sdl-meta-section .sdl-meta-group {
            margin: 4px 0 6px 0;
        }
        #sdl-meta-section .sdl-meta-group-title {
            color: #888; font-size: 10px; margin-bottom: 2px;
            text-transform: uppercase; letter-spacing: 0.5px;
        }
        #sdl-meta-section .sdl-meta-checks {
            display: flex; flex-wrap: wrap; gap: 4px 10px;
        }
        #sdl-meta-section .sdl-meta-checks label {
            color: #ddd; cursor: pointer; display: flex; align-items: center; gap: 3px;
            font-size: 12px;
        }
        #sdl-meta-section .sdl-meta-quick {
            display: flex; gap: 6px; margin-top: 4px;
        }
        #sdl-meta-section .sdl-meta-quick button {
            background: #2a2a2a; color: #aaa; border: 1px solid #444;
            padding: 2px 8px; border-radius: 3px; font-size: 10px; cursor: pointer;
        }
        #sdl-meta-section .sdl-meta-quick button:hover { background: #333; color: #fff; }
        #sdl-meta-section.collapsed .sdl-meta-group,
        #sdl-meta-section.collapsed .sdl-meta-quick { display: none; }
        #sdl-meta-section .sdl-meta-toggle { font-size: 14px; }
        #sdl-meta-section.collapsed .sdl-meta-toggle { transform: rotate(-90deg); }
        #sdl-panel button.sdl-go {
            width: 100%; margin-top: 10px; background: #4a90e2; color: #fff;
            border: none; padding: 8px; border-radius: 5px; font-size: 13px; font-weight: 600;
            cursor: pointer;
        }
        #sdl-panel button.sdl-go:hover { background: #5aa0f2; }
        #sdl-panel button.sdl-go:disabled { background: #555; cursor: not-allowed; }
        #sdl-panel button.sdl-toggle {
            background: transparent; color: #888; border: none; cursor: pointer;
            font-size: 16px; padding: 0; width: 20px; height: 20px;
        }
        #sdl-status {
            margin-top: 8px; padding: 6px 8px; font-size: 11px;
            background: #2a2a2a; border-radius: 4px; color: #bbb; min-height: 16px;
            word-break: break-all;
        }
        #sdl-status.success { color: #6fdc6f; }
        #sdl-status.error { color: #ff6b6b; }
        #sdl-panel.collapsed > *:not(h4) { display: none; }
        #sdl-panel.collapsed h4 { margin: 0; }
    `);

    let statusEl, runBtn;
    function logStatus(msg, type) {
        if (statusEl) {
            statusEl.textContent = msg;
            statusEl.className = type || '';
            // 동적 상태 메시지는 언어 변경 시 갱신 대상에서 제외
            statusEl.removeAttribute('data-i18n');
        }
        console.log('[SDL]', msg);
    }

    function setRunning(running) {
        if (runBtn) {
            runBtn.disabled = running;
            runBtn.textContent = running ? t('running') : t('run');
        }
    }

    function buildMetaSection() {
        const groups = {
            date:    { titleKey: 'groupDate',    opts: [] },
            work:    { titleKey: 'groupWork',    opts: [] },
            episode: { titleKey: 'groupEpisode', opts: [] },
            body:    { titleKey: 'groupBody',    opts: [] },
        };
        META_OPTIONS.forEach(o => {
            if (groups[o.group]) groups[o.group].opts.push(o);
        });

        const sec = document.createElement('div');
        sec.id = 'sdl-meta-section';
        const headerHtml = `
            <div class="sdl-meta-header">
                <span data-i18n="metaSection">${t('metaSection')}</span>
                <span class="sdl-meta-toggle">▼</span>
            </div>
        `;
        let groupsHtml = '';
        for (const key of ['date', 'work', 'episode', 'body']) {
            const g = groups[key];
            if (!g.opts.length) continue;
            groupsHtml += `<div class="sdl-meta-group">`;
            groupsHtml += `<div class="sdl-meta-group-title" data-i18n="${g.titleKey}">${t(g.titleKey)}</div>`;
            groupsHtml += `<div class="sdl-meta-checks">`;
            g.opts.forEach(o => {
                groupsHtml += `<label><input type="checkbox" class="sdl-meta-cb" data-key="${o.key}"> <span data-i18n="${o.labelKey}">${t(o.labelKey)}</span></label>`;
            });
            groupsHtml += `</div></div>`;
        }
        const quickHtml = `
            <div class="sdl-meta-quick">
                <button data-preset="default" data-i18n="presetDefault">${t('presetDefault')}</button>
                <button data-preset="all" data-i18n="presetAll">${t('presetAll')}</button>
                <button data-preset="none" data-i18n="presetNone">${t('presetNone')}</button>
                <button data-preset="translate" data-i18n="presetTranslate">${t('presetTranslate')}</button>
            </div>
        `;
        sec.innerHTML = headerHtml + groupsHtml + quickHtml;
        return sec;
    }

    function applyPrefsToUI(panel, prefs) {
        panel.querySelectorAll('.sdl-meta-cb').forEach(cb => {
            const key = cb.dataset.key;
            cb.checked = !!prefs[key];
        });
    }

    function readPrefsFromUI(panel) {
        const prefs = {};
        panel.querySelectorAll('.sdl-meta-cb').forEach(cb => {
            prefs[cb.dataset.key] = cb.checked;
        });
        return prefs;
    }

    function applyPreset(panel, preset) {
        const prefs = {};
        if (preset === 'default') {
            META_OPTIONS.forEach(o => { prefs[o.key] = o.def; });
        } else if (preset === 'all') {
            META_OPTIONS.forEach(o => { prefs[o.key] = true; });
        } else if (preset === 'none') {
            META_OPTIONS.forEach(o => { prefs[o.key] = false; });
        } else if (preset === 'translate') {
            // 번역기 입력용: 본문에 영향 없는 메타데이터는 최소화 (제목/부제/마에가키/아토가키만)
            META_OPTIONS.forEach(o => { prefs[o.key] = false; });
            prefs.title = true;
            prefs.subtitle = true;
            prefs.preface = true;
            prefs.afterword = true;
        }
        applyPrefsToUI(panel, prefs);
    }

    function buildPanel() {
        const panel = document.createElement('div');
        panel.id = 'sdl-panel';

        const langOptionsHtml = LANGUAGES.map(l =>
            `<option value="${l.code}"${l.code === CURRENT_LANG ? ' selected' : ''}>${l.label}</option>`
        ).join('');

        panel.innerHTML = `
            <h4>
                <span>${t('panelTitle')}</span>
                <button class="sdl-toggle" title="${t('panelTitle')}">−</button>
            </h4>
            <div class="sdl-row">
                <label data-i18n="language">${t('language')}</label>
                <select id="sdl-lang">${langOptionsHtml}</select>
            </div>
            <div class="sdl-row">
                <label data-i18n="scope">${t('scope')}</label>
                <select id="sdl-scope">
                    <option value="current" data-i18n="scopeCurrent">${t('scopeCurrent')}</option>
                    <option value="all" data-i18n="scopeAll">${t('scopeAll')}</option>
                </select>
            </div>
            <div class="sdl-row" id="sdl-structure-row">
                <label data-i18n="structure">${t('structure')}</label>
                <select id="sdl-structure">
                    <option value="combined" data-i18n="structCombined">${t('structCombined')}</option>
                    <option value="individual" data-i18n="structIndividual">${t('structIndividual')}</option>
                </select>
            </div>
            <div class="sdl-row sdl-formats">
                <label><input type="checkbox" id="sdl-fmt-txt" checked> TXT</label>
                <label><input type="checkbox" id="sdl-fmt-pdf" checked> PDF</label>
            </div>
        `;
        panel.appendChild(buildMetaSection());

        const goWrap = document.createElement('div');
        goWrap.innerHTML = `
            <button class="sdl-go" data-i18n="run">${t('run')}</button>
            <div id="sdl-status" data-i18n="ready">${t('ready')}</div>
        `;
        panel.appendChild(goWrap);

        document.body.appendChild(panel);

        statusEl = panel.querySelector('#sdl-status');
        runBtn = panel.querySelector('.sdl-go');

        // 메타데이터 초기 상태 적용
        const initialPrefs = loadPrefs();
        applyPrefsToUI(panel, initialPrefs);

        // 언어 변경 이벤트
        const langSelect = panel.querySelector('#sdl-lang');
        langSelect.addEventListener('change', () => {
            setLang(langSelect.value);
            refreshUILanguage(panel);
        });

        // 메타데이터 섹션 펼침/접힘
        const metaSec = panel.querySelector('#sdl-meta-section');
        const metaHeader = metaSec.querySelector('.sdl-meta-header');
        metaHeader.addEventListener('click', () => {
            metaSec.classList.toggle('collapsed');
            const toggleEl = metaSec.querySelector('.sdl-meta-toggle');
            toggleEl.textContent = metaSec.classList.contains('collapsed') ? '▶' : '▼';
        });

        // 프리셋 버튼
        metaSec.querySelectorAll('.sdl-meta-quick button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                applyPreset(panel, btn.dataset.preset);
            });
        });

        // 체크박스 변경 시 저장
        panel.querySelectorAll('.sdl-meta-cb').forEach(cb => {
            cb.addEventListener('change', () => {
                savePrefs(readPrefsFromUI(panel));
            });
        });

        // 범위 변경 시 구조 표시
        const scopeEl = panel.querySelector('#sdl-scope');
        const structureRow = panel.querySelector('#sdl-structure-row');
        const updateStructureVisibility = () => {
            structureRow.style.display = scopeEl.value === 'all' ? '' : 'none';
        };
        scopeEl.addEventListener('change', updateStructureVisibility);
        if (!URLInfo.isEpisodePage()) {
            scopeEl.querySelector('option[value="current"]').disabled = true;
            scopeEl.value = 'all';
        }
        updateStructureVisibility();

        // 전체 패널 접기/펼치기
        panel.querySelector('.sdl-toggle').addEventListener('click', () => {
            panel.classList.toggle('collapsed');
            panel.querySelector('.sdl-toggle').textContent =
                panel.classList.contains('collapsed') ? '+' : '−';
        });

        runBtn.addEventListener('click', async () => {
            const scope = scopeEl.value;
            const structure = panel.querySelector('#sdl-structure').value;
            const formats = {
                txt: panel.querySelector('#sdl-fmt-txt').checked,
                pdf: panel.querySelector('#sdl-fmt-pdf').checked,
            };
            if (!formats.txt && !formats.pdf) {
                alert(t('alertNoFormat'));
                return;
            }
            const prefs = readPrefsFromUI(panel);
            savePrefs(prefs);

            setRunning(true);
            try {
                if (scope === 'current') await doCurrentEpisode(formats, prefs);
                else await doAllEpisodes(formats, structure, prefs);
            } catch (err) {
                console.error(err);
                logStatus(t('statusError', err.message), 'error');
            } finally {
                setRunning(false);
            }
        });
    }

    /**
     * 언어 변경 시 모든 data-i18n 요소 텍스트 갱신
     */
    function refreshUILanguage(panel) {
        // 패널 제목 (h4 첫번째 span)
        const titleSpan = panel.querySelector('h4 > span');
        if (titleSpan) titleSpan.textContent = t('panelTitle');

        // data-i18n 속성을 가진 모든 요소 업데이트
        panel.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            el.textContent = t(key);
        });

        // 상태 영역: '준비 완료' 키가 있으면 그것만 갱신, 그 외 동적 상태는 그대로 둠
        if (statusEl && statusEl.getAttribute('data-i18n') === 'ready') {
            statusEl.textContent = t('ready');
        }

        // 버튼 텍스트는 작업 중이 아닐 때만 갱신
        if (runBtn && !runBtn.disabled) {
            runBtn.textContent = t('run');
        }
    }

    /* ============================================================
     * 초기화
     * ============================================================ */
    function init() {
        if (!URLInfo.getNcode()) return;
        if (typeof window.jspdf === 'undefined' || typeof window.JSZip === 'undefined') {
            setTimeout(init, 200);
            return;
        }
        buildPanel();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
