import { useState, useEffect, useRef } from 'react';
import './App.css';

// ==================== INDEXEDDB SETUP ====================
const DB_NAME = 'VKS_DB';
const DB_VERSION = 1;
const PROBLEMS_STORE = 'problems';
const ANSWERS_STORE = 'answers';

let dbPromise = null;

function openDB() {
    if (dbPromise) return dbPromise;
    
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains(PROBLEMS_STORE)) {
                const problemStore = db.createObjectStore(PROBLEMS_STORE, { keyPath: 'id' });
                problemStore.createIndex('timestamp', 'timestamp');
                problemStore.createIndex('category', 'category');
                problemStore.createIndex('isSynced', 'isSynced');
            }
            
            if (!db.objectStoreNames.contains(ANSWERS_STORE)) {
                const answerStore = db.createObjectStore(ANSWERS_STORE, { keyPath: 'id' });
                answerStore.createIndex('problemId', 'problemId');
                answerStore.createIndex('timestamp', 'timestamp');
            }
        };
    });
    
    return dbPromise;
}

// ==================== DATABASE OPERATIONS ====================
async function saveProblem(problem) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PROBLEMS_STORE, 'readwrite');
        const store = tx.objectStore(PROBLEMS_STORE);
        const request = store.put(problem);
        request.onsuccess = () => resolve(problem);
        request.onerror = () => reject(request.error);
    });
}

async function getAllProblems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PROBLEMS_STORE, 'readonly');
        const store = tx.objectStore(PROBLEMS_STORE);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev');
        const problems = [];
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                problems.push(cursor.value);
                cursor.continue();
            } else {
                resolve(problems);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

async function saveAnswer(answer) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ANSWERS_STORE, 'readwrite');
        const store = tx.objectStore(ANSWERS_STORE);
        const request = store.put(answer);
        request.onsuccess = () => resolve(answer);
        request.onerror = () => reject(request.error);
    });
}

async function getAnswersForProblem(problemId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ANSWERS_STORE, 'readonly');
        const store = tx.objectStore(ANSWERS_STORE);
        const index = store.index('problemId');
        const request = index.getAll(problemId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function getUnsyncedCount() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PROBLEMS_STORE, 'readonly');
        const store = tx.objectStore(PROBLEMS_STORE);
        const index = store.index('isSynced');
        const request = index.getAll(IDBKeyRange.only(0));
        request.onsuccess = () => resolve(request.result.length);
        request.onerror = () => reject(request.error);
    });
}

async function deleteAllData() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([PROBLEMS_STORE, ANSWERS_STORE], 'readwrite');
        tx.objectStore(PROBLEMS_STORE).clear();
        tx.objectStore(ANSWERS_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ==================== CONSTANTS ====================
const categories = [
    { id: 'crop', name: '🌾 Crop', nameAm: '🌾 ሰብል', nameOr: '🌾 Midhaan', nameTi: '🌾 ብርዒ' },
    { id: 'animal', name: '🐄 Animal', nameAm: '🐄 እንስሳ', nameOr: '🐄 Bineelda', nameTi: '🐄 እንስሳ' },
    { id: 'health', name: '🤰 Health', nameAm: '🤰 ጤና', nameOr: '🤰 Fayyaa', nameTi: '🤰 ጥዕና' },
    { id: 'water', name: '💧 Water', nameAm: '💧 ውሃ', nameOr: '💧 Bishaan', nameTi: '💧 ማይ' },
    { id: 'market', name: '💰 Market', nameAm: '💰 ገበያ', nameOr: '💰 Gabaa', nameTi: '💰 ዓዳ' },
    { id: 'weather', name: '⛅ Weather', nameAm: '⛅ አየር', nameOr: '⛅ Qilleensa', nameTi: '⛅ ኩነታት ኣየር' }
];

const languages = [
    { code: 'am', name: 'አማርኛ', nameEn: 'Amharic', ttsLang: 'am-ET' },
    { code: 'or', name: 'Oromiffa', nameEn: 'Oromifa', ttsLang: 'om-ET' },
    { code: 'ti', name: 'ትግርኛ', nameEn: 'Tigrinya', ttsLang: 'ti-ET' }
];

const translations = {
    am: {
        appTitle: 'የመንደር እውቀት ሥርዓት',
        report: 'ሪፖርት',
        feed: 'ምግብ',
        sync: 'ማመሳሰል',
        pressAndHold: 'ችግርዎን ለመቅዳት ተጭነው ይያዙ',
        recording: 'በመቅዳት ላይ... ለማቆም ይልቀቁ',
        voiceProblem: 'የድምጽ ችግር',
        problemReported: 'ችግር ተዘግቧል',
        submit: 'አስገባ',
        selectCategory: 'ምድብ ይምረጡ',
        textAlternative: 'በጽሁፍ ሪፖርት ማድረግ',
        typeProblem: 'ችግርዎን ይግለጹ...',
        answers: 'መልሶች',
        addAnswer: 'መልስ ያክሉ',
        postAnswer: 'መልስ ለጥፍ',
        cancel: 'ሰርዝ',
        verified: 'የተረጋገጠ',
        syncNow: 'አሁን አመሳስል',
        exportUSB: 'ወደ ዩኤስቢ ላክ',
        championMode: 'ሻምፒዮን ሁነታ',
        villagerMode: 'መንደርኛ ሁነታ',
        pendingSync: 'ማመሳሰል በመጠበቅ ላይ',
        allSynced: 'ሁሉም ተመሳስሏል',
        noProblems: 'ምንም ችግሮች አልተገኙም',
        settings: 'ቅንብሮች',
        championTools: 'የሻምፒዮን መሳሪያዎች',
        searchLibrary: 'መጽሐፍት ውስጥ ፈልግ',
        readAloud: 'ጮህ አንብብ',
        characterLimit: 'ቁምፊዎች',
        confirmDelete: 'ሁሉንም ውሂብ መሰረዝ እንደሚፈልጉ እርግጠኛ ነዎት?'
    },
    or: {
        appTitle: 'Sistema Beekumsa Ganda',
        report: 'Gabaasa',
        feed: 'Soorata',
        sync: 'Waliin Makuu',
        pressAndHold: 'Rakkina keessan galmeessuuf dhidhiibaa qabadhaa',
        recording: 'Galmeessaa... Gatabsuu',
        voiceProblem: 'Rakkina Sagalee',
        problemReported: 'Rakkiin gabaasame',
        submit: 'Ergi',
        selectCategory: 'Ramaddii filadhu',
        textAlternative: 'Gabaasa barreeffamaan',
        typeProblem: 'Rakkina keessan ibsaa...',
        answers: 'Deebii',
        addAnswer: 'Deebii dabali',
        postAnswer: 'Deebisi',
        cancel: 'Haqi',
        verified: 'Mirkanaa\'e',
        syncNow: 'Amma waliin maki',
        exportUSB: 'USB ergi',
        championMode: 'Haala Abbaa Abeerraa',
        villagerMode: 'Haala Ganda',
        pendingSync: 'Waliin makuuf eeggachaa',
        allSynced: 'Hunduu waliin makame',
        noProblems: 'Rakkini hin jiru',
        settings: 'Qindeessaa',
        championTools: 'Meela Abbaa Abeerraa',
        searchLibrary: 'Galmee kitaabaa keessatti barbaadi',
        readAloud: 'Sagaleessaan dubbisi',
        characterLimit: 'Arfii',
        confirmDelete: 'Daataa hunda haquu akka barbaaddu mirkaneeffatte?'
    },
    ti: {
        appTitle: 'ስርዓተ ፍልጠት ቀበላ',
        report: 'ሕታም',
        feed: 'ምግቢ',
        sync: 'ምስምማዕ',
        pressAndHold: 'ችግርኩም ንምቅዳሕ ጠዚቕኩም ሐዝዎ',
        recording: 'ይቐድሕ ኣሎ... ንምውዳእ ሓዲግኩምዎ',
        voiceProblem: 'ችግር ድምጺ',
        problemReported: 'ችግር ሕቲሙ',
        submit: 'ኣቅርብ',
        selectCategory: 'ምድብ ምረጹ',
        textAlternative: 'ብጽሑፍ ሕታም',
        typeProblem: 'ችግርኩም ግለጹ...',
        answers: 'መልሲ',
        addAnswer: 'መልሲ ውስኹ',
        postAnswer: 'መልሲ ልጠፍ',
        cancel: 'ኣትርፉ',
        verified: 'ተረጋጊጹ',
        syncNow: 'ሕጂ ኣመሳስል',
        exportUSB: 'ናብ ዩኤስቢ ሰደድ',
        championMode: 'ኩነተ ሻምፕዮን',
        villagerMode: 'ኩነተ ቀበላ',
        pendingSync: 'ምስምማዕ ይጽበ ኣሎ',
        allSynced: 'ኩሉ ተመሲሱ',
        noProblems: 'ችግራት የለን',
        settings: 'ምድላውታ',
        championTools: 'መሳርሒታት ሻምፕዮን',
        searchLibrary: 'ኣብ መጻሕፍቲ ድለዩ',
        readAloud: 'ብድምጺ ኣንብብ',
        characterLimit: 'ጹራፍ',
        confirmDelete: 'ኩሉ ዳታ ምምራዝኩም ወሲኹም ዲኹም?'
    }
};

// ==================== MAIN APP COMPONENT ====================
function App() {
    const [activeScreen, setActiveScreen] = useState('home');
    const [problems, setProblems] = useState([]);
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [toast, setToast] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [formData, setFormData] = useState({ category: 'crop', text: '', voiceBlob: null });
    const [answerText, setAnswerText] = useState('');
    const [selectedProblemId, setSelectedProblemId] = useState(null);
    const [language, setLanguage] = useState('am');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    
    const t = translations[language];
    
    useEffect(() => {
        loadProblems();
        updateUnsyncedCount();
    }, []);
    
    async function loadProblems() {
        const allProblems = await getAllProblems();
        const problemsWithAnswers = await Promise.all(
            allProblems.map(async (problem) => {
                const answers = await getAnswersForProblem(problem.id);
                return { ...problem, answers };
            })
        );
        setProblems(problemsWithAnswers);
    }
    
    async function updateUnsyncedCount() {
        const count = await getUnsyncedCount();
        setUnsyncedCount(count);
    }
    
    function showToast(message, isError = false) {
        setToast(message);
        setTimeout(() => setToast(null), 2500);
    }
    
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedAudio(audioUrl);
                setFormData(prev => ({ ...prev, voiceBlob: audioBlob }));
                showToast(t.recording);
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            showToast('Cannot access microphone', true);
        }
    }
    
    function stopRecording() {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }
    
    function speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            const langMap = { am: 'am-ET', or: 'om-ET', ti: 'ti-ET' };
            utterance.lang = langMap[language] || 'en-US';
            utterance.rate = 0.9;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        } else {
            showToast('Text-to-speech not supported', true);
        }
    }
    
    function blobToBase64(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }
    
    async function submitProblem() {
        if (!formData.text && !formData.voiceBlob) {
            showToast('Please add a voice recording or type a problem', true);
            return;
        }
        
        const problemId = Date.now().toString();
        let voiceBase64 = null;
        if (formData.voiceBlob) {
            voiceBase64 = await blobToBase64(formData.voiceBlob);
        }
        
        const problem = {
            id: problemId,
            category: formData.category,
            text: formData.text || (recordedAudio ? 'Voice problem reported' : ''),
            voiceBlob: voiceBase64,
            timestamp: Date.now(),
            isSynced: false,
            upvotes: 0,
            language: language
        };
        
        await saveProblem(problem);
        setFormData({ category: 'crop', text: '', voiceBlob: null });
        setRecordedAudio(null);
        await loadProblems();
        await updateUnsyncedCount();
        setActiveScreen('feed');
        showToast('Problem reported successfully!');
    }
    
    async function submitAnswer(problemId) {
        if (!answerText.trim()) {
            showToast('Please type an answer', true);
            return;
        }
        
        const isChampion = localStorage.getItem('isChampion') === 'true';
        
        const answer = {
            id: Date.now().toString(),
            problemId: problemId,
            text: answerText,
            isChampionVerified: isChampion,
            timestamp: Date.now(),
            upvotes: 0,
            language: language
        };
        
        await saveAnswer(answer);
        setAnswerText('');
        setSelectedProblemId(null);
        await loadProblems();
        showToast('Answer submitted!');
    }
    
    async function simulateSync() {
        const unsynced = await getUnsyncedCount();
        if (unsynced === 0) {
            showToast('All problems are already synced!');
            return;
        }
        
        showToast(`Syncing ${unsynced} problems...`);
        
        setTimeout(async () => {
            const db = await openDB();
            const tx = db.transaction(PROBLEMS_STORE, 'readwrite');
            const store = tx.objectStore(PROBLEMS_STORE);
            const index = store.index('isSynced');
            const request = index.openCursor(IDBKeyRange.only(0));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const problem = cursor.value;
                    problem.isSynced = true;
                    store.put(problem);
                    cursor.continue();
                } else {
                    updateUnsyncedCount();
                    loadProblems();
                    showToast('Sync complete!');
                }
            };
        }, 2000);
    }
    
    function exportToUSB() {
        const data = {
            problems: problems,
            exportDate: new Date().toISOString(),
            villageCode: 'ETH-OR-012',
            version: '2.0'
        };
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vks_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup exported!');
    }
    
    async function confirmDeleteAll() {
        if (showDeleteConfirm) {
            await deleteAllData();
            await loadProblems();
            await updateUnsyncedCount();
            setShowDeleteConfirm(false);
            showToast('All data cleared');
        } else {
            setShowDeleteConfirm(true);
            setTimeout(() => setShowDeleteConfirm(false), 5000);
        }
    }
    
    function toggleChampionMode() {
        const current = localStorage.getItem('isChampion') === 'true';
        localStorage.setItem('isChampion', (!current).toString());
        showToast(current ? 'Champion mode OFF' : 'Champion mode ON');
        loadProblems();
    }
    
    const libraryArticles = [
        { id: 1, titleAm: '🌾 የጤፍ በሽታ ሕክምና', titleOr: '🌾 Walalgaa Dhukkuba Qamadii', titleTi: '🌾 ሕክምና ሕማም ጣፍ', category: 'crop', 
          contentAm: 'በየ7 ቀን የሎሚ ድኝ መርዝ ይረጩ። የበሽታ ቅጠሎችን ወዲያውኑ ያስወግዱ።',
          contentOr: 'Guyyaa 7 keessatti sumni qandhalaa bubuteessi. Baala dhukkubsate yeroo yeroodhaan baleessi.',
          contentTi: 'ብዕሽተ መዓልቲ 7 መርዚ ሎሚ ርጽፉ። ቈጽሊ ሕሙማት ብቕልጡፍ ኣውጽእዎ።' },
        { id: 2, titleAm: '🐄 የላም ተቅማጥ ሕክምና', titleOr: '🐄 Walalgaa Korma Albaasaa', titleTi: '🐄 ሕክምና ድርቃይ ላም', category: 'animal',
          contentAm: 'ንጹህ ውሃ ከአፍ ውስጥ የሚወሰድ ጨው በማደባለቅ ይስጡ። ለ24 ሰዓት ከቀጠለ የእንስሳ ሐኪም ያማክሩ።',
          contentOr: 'Bishaan qulqulluu waadaan soogidda afaaniitiin obaasi. Yoo saaatii 24 turte doktor bineeldaa mariisi.',
          contentTi: 'ንጹህ ማይ ምስ ጨው ኣፍ ዚወሰድ ኣዳለዉ ሃብዎ። ን24 ሰዓት እንተ ቀጺሉ ሓኪም እንስሳ ምኽሩ።' }
    ];
    
    const getLocalizedTitle = (article) => {
        if (language === 'am') return article.titleAm;
        if (language === 'or') return article.titleOr;
        return article.titleTi;
    };
    
    const getLocalizedContent = (article) => {
        if (language === 'am') return article.contentAm;
        if (language === 'or') return article.contentOr;
        return article.contentTi;
    };
    
    const filteredLibrary = libraryArticles.filter(article => 
        getLocalizedTitle(article).toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const renderHome = () => (
        <div>
            <div className="voice-button">
                <button 
                    className={`mic-btn ${isRecording ? 'recording' : ''}`}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                >
                    🎤
                </button>
                <p className="instruction">
                    {isRecording ? t.recording : t.pressAndHold}
                </p>
                {recordedAudio && (
                    <div style={{ marginTop: 20, textAlign: 'center', width: '100%' }}>
                        <audio controls src={recordedAudio} style={{ width: '100%' }}></audio>
                        <select 
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            style={{ marginTop: 12, padding: 10, width: '100%', borderRadius: 12 }}
                        >
                            {categories.map(cat => {
                                let catName = cat.name;
                                if (language === 'am') catName = cat.nameAm;
                                else if (language === 'or') catName = cat.nameOr;
                                else if (language === 'ti') catName = cat.nameTi;
                                return <option key={cat.id} value={cat.id}>{catName}</option>;
                            })}
                        </select>
                        <button className="btn-primary" onClick={submitProblem}>{t.submit}</button>
                    </div>
                )}
            </div>
            
            <div className="text-alternative">
                <div className="divider">
                    <span>{t.textAlternative}</span>
                </div>
                <div className="form-group">
                    <textarea 
                        value={formData.text}
                        onChange={(e) => {
                            if (e.target.value.length <= 1000) {
                                setFormData({...formData, text: e.target.value});
                            }
                        }}
                        placeholder={t.typeProblem}
                        maxLength="1000"
                        style={{ width: '100%', minHeight: '100px' }}
                    />
                    <div className="char-counter">
                        {formData.text.length}/1000 {t.characterLimit}
                    </div>
                </div>
                <div className="form-group">
                    <label>{t.selectCategory}</label>
                    <select 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                        {categories.map(cat => {
                            let catName = cat.name;
                            if (language === 'am') catName = cat.nameAm;
                            else if (language === 'or') catName = cat.nameOr;
                            else if (language === 'ti') catName = cat.nameTi;
                            return <option key={cat.id} value={cat.id}>{catName}</option>;
                        })}
                    </select>
                </div>
                <button className="btn-primary" onClick={submitProblem}>{t.submit}</button>
            </div>
        </div>
    );
    
    const renderFeed = () => {
        if (problems.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    <span style={{ fontSize: 48 }}>📭</span>
                    <p>{t.noProblems}</p>
                </div>
            );
        }
        
        return problems.map(problem => {
            let catName = categories.find(c => c.id === problem.category)?.name;
            if (language === 'am') catName = categories.find(c => c.id === problem.category)?.nameAm;
            else if (language === 'or') catName = categories.find(c => c.id === problem.category)?.nameOr;
            else if (language === 'ti') catName = categories.find(c => c.id === problem.category)?.nameTi;
            
            return (
                <div key={problem.id} className="problem-card">
                    <div className="problem-category">{catName}</div>
                    <div className="problem-text">
                        {problem.text || (problem.voiceBlob ? '🎤 ' + t.voiceProblem : t.problemReported)}
                    </div>
                    <div className="problem-meta">
                        <span>{new Date(problem.timestamp).toLocaleString()}</span>
                        <span>👍 {problem.upvotes || 0}</span>
                        <span>{problem.isSynced ? '✓ ' + t.allSynced : '⏳ ' + t.pendingSync}</span>
                    </div>
                    {problem.voiceBlob && (
                        <audio controls src={problem.voiceBlob} style={{ width: '100%', marginTop: 8 }}></audio>
                    )}
                    
                    <div className="answer-section">
                        <strong>💬 {t.answers} ({problem.answers?.length || 0})</strong>
                        {problem.answers?.map(answer => (
                            <div key={answer.id} className="answer-item">
                                <div>{answer.text}</div>
                                <div className="answer-actions">
                                    <span className="answer-date">{new Date(answer.timestamp).toLocaleString()}</span>
                                    {answer.isChampionVerified && <span className="champion-badge">⭐ {t.verified}</span>}
                                    <button className="speak-btn" onClick={() => speakText(answer.text)}>🔊 {t.readAloud}</button>
                                </div>
                            </div>
                        ))}
                        
                        {selectedProblemId === problem.id ? (
                            <div style={{ marginTop: 12 }}>
                                <textarea 
                                    value={answerText}
                                    onChange={(e) => setAnswerText(e.target.value)}
                                    placeholder={t.addAnswer}
                                    style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid #ddd' }}
                                    maxLength="1000"
                                />
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <button className="btn-primary" style={{ flex: 1 }} onClick={() => submitAnswer(problem.id)}>
                                        {t.postAnswer}
                                    </button>
                                    <button className="btn-secondary" style={{ flex: 1, background: '#ccc' }} onClick={() => setSelectedProblemId(null)}>
                                        {t.cancel}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button className="add-answer-btn" onClick={() => setSelectedProblemId(problem.id)}>
                                ➕ {t.addAnswer}
                            </button>
                        )}
                    </div>
                </div>
            );
        });
    };
    
    const renderSync = () => {
        const isChampion = localStorage.getItem('isChampion') === 'true';
        
        return (
            <div>
                <div className="sync-panel">
                    <h4>📡 {t.syncNow}</h4>
                    <div className="sync-stats">
                        <p>📤 {t.pendingSync}: <strong>{unsyncedCount}</strong></p>
                        <p>💾 Storage: ~{Math.min(95, problems.length * 0.1).toFixed(1)}MB / 500MB</p>
                    </div>
                    <button className="btn-primary" onClick={simulateSync}>
                        🔄 {t.syncNow}
                    </button>
                </div>
                
                {isChampion && (
                    <div className="sync-panel" style={{ background: '#fff8e1' }}>
                        <h4>⭐ {t.championTools}</h4>
                        <button className="btn-warning" style={{ background: '#ff9800', width: '100%', padding: 14, borderRadius: 40, border: 'none', color: 'white', fontWeight: 'bold', marginBottom: 10 }} onClick={exportToUSB}>
                            💾 {t.exportUSB}
                        </button>
                        <button className="btn-danger" style={{ background: '#f44336', width: '100%', padding: 14, borderRadius: 40, border: 'none', color: 'white', fontWeight: 'bold' }} onClick={confirmDeleteAll}>
                            🗑️ {showDeleteConfirm ? t.confirmDelete : 'Clear All Data'}
                        </button>
                    </div>
                )}
                
                <div className="sync-panel">
                    <h4>⚙️ {t.settings}</h4>
                    <button className="btn-secondary" style={{ background: '#9e9e9e', width: '100%', padding: 14, borderRadius: 40, border: 'none', color: 'white', fontWeight: 'bold' }} onClick={toggleChampionMode}>
                        {isChampion ? `⭐ ${t.championMode}` : `👤 ${t.villagerMode}`}
                    </button>
                </div>
                
                <div className="sync-panel">
                    <h4>📚 {t.searchLibrary}</h4>
                    <input 
                        type="text"
                        placeholder={t.searchLibrary}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #ddd', marginBottom: 12 }}
                    />
                    {filteredLibrary.map(article => (
                        <div key={article.id} className="library-item">
                            <div className="library-title">{getLocalizedTitle(article)}</div>
                            <div className="library-content">{getLocalizedContent(article)}</div>
                            <button className="speak-btn" onClick={() => speakText(getLocalizedContent(article))}>🔊 {t.readAloud}</button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    
    const renderScreen = () => {
        switch(activeScreen) {
            case 'home': return renderHome();
            case 'feed': return renderFeed();
            case 'sync': return renderSync();
            default: return renderHome();
        }
    };
    
    const isChampion = localStorage.getItem('isChampion') === 'true';
    
    const navItems = [
        { id: 'home', icon: '🎤', label: t.report },
        { id: 'feed', icon: '👥', label: t.feed },
        { id: 'sync', icon: '🔄', label: t.sync }
    ];
    
    return (
        <div className="app">
            <div className="header">
                <div className="language-selector">
                    {languages.map(lang => (
                        <button 
                            key={lang.code}
                            className={`lang-btn ${language === lang.code ? 'active' : ''}`}
                            onClick={() => setLanguage(lang.code)}
                        >
                            {lang.name}
                        </button>
                    ))}
                </div>
                <h1>🌾 VKS</h1>
                <p>{t.appTitle}</p>
            </div>
            
            <div className="sync-status">
                <span>{unsyncedCount > 0 ? `⏳ ${unsyncedCount} ${t.pendingSync}` : `✓ ${t.allSynced}`}</span>
                <span>{isChampion ? `⭐ ${t.championMode}` : `👤 ${t.villagerMode}`}</span>
                <span>🌐 Offline</span>
            </div>
            
            <div className="nav-icons">
                {navItems.map(item => (
                    <div 
                        key={item.id}
                        className={`nav-icon ${activeScreen === item.id ? 'active' : ''}`}
                        onClick={() => setActiveScreen(item.id)}
                    >
                        <span>{item.icon}</span>
                        <label>{item.label}</label>
                    </div>
                ))}
            </div>
            
            <div className="content">
                {renderScreen()}
            </div>
            
            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}

export default App;
