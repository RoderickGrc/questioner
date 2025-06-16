// script.js

// --- Configuración del Quiz (valores por defecto) ---
let configRepetitionsOnError = 0;
let configInitialRepetitions = 1;
const QUIZ_CONFIG_KEY = 'interactiveQuizConfig'; // Clave para localStorage
const COLLECTION_STORAGE_KEY = 'selectedCollectionId';

// Referencias a elementos del DOM para el modal de configuración
let configButton = null;
let configModalOverlay = null;
let configModal = null;
let configRepsOnErrorInput = null;
let configInitialRepsInput = null;
let configThemeSelect = null;
let saveConfigButton = null;
let closeModalButton = null;
let closeModalXButton = null;
let currentQuestionIndex = null;
let questionQueue = [];
let questionStats = {};
let totalQuestions = 0;
let isMultiSelectMode = false;

// Referencias a elementos del DOM
let quizDiv = null;
let statusMessageDiv = null;
let fileInput = null;
let csvFileInput = null;
let collectionSelect = null;
let changeCollectionButton = null;
let collectionModalOverlay = null;
let collectionModal = null;
let confirmCollectionButton = null;
let customOption = null;
let availableCollections = [];
let quizContainerDiv = null; // <-- NUEVO: Referencia al contenedor principal
let timeProgressDiv = null;
let timeBarDiv = null;
let timeRemainingSpan = null;

let initialTotalRepetitions = 0;
let questionStartTime = null;
let questionVisibleStartTime = null;
let accumulatedVisibleTime = 0;
let avgTimePerRep = 30; // EMA initial estimate (seconds per repetition)
const EMA_N = 20;
const EMA_ALPHA = 2 / (EMA_N + 1);

let autosaveIntervalId = null;

let themeMode = 'dark';

const SUPABASE_URL = 'https://infuklajuugncqkarlnp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZnVrbGFqdXVnbmNxa2FybG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNTIwNzMsImV4cCI6MjA2NTYyODA3M30.-rb8x3G7T0FN6U2GMz1LD_tulNFG9jKyvdv5iDoDidg';
let supabase = null;

function getCollectionIdFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[0] === 'collections' ? (parts[1] || null) : null;
}

function updateUrlForCollection(id, replace = false) {
    const url = id ? `/collections/${id}` : '/collections';
    if (replace) {
        history.replaceState(null, '', url);
    } else {
        history.pushState(null, '', url);
    }
}

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos clave del DOM
    quizDiv = document.getElementById('quiz');
    statusMessageDiv = document.getElementById('status-message');
    fileInput = document.getElementById('file-input');
    csvFileInput = document.getElementById('csv-file-input');
    quizContainerDiv = document.querySelector('.quiz-container');
    timeProgressDiv = document.getElementById('time-progress');
    timeBarDiv = document.getElementById('time-bar');
    timeRemainingSpan = document.getElementById('time-remaining');
    collectionSelect = document.getElementById('collection-select');
    changeCollectionButton = document.getElementById('change-collection-button');
    collectionModalOverlay = document.getElementById('collection-modal-overlay');
    collectionModal = document.getElementById('collection-modal');
    confirmCollectionButton = document.getElementById('confirm-collection-button');

    // Referencias para el modal de configuración
    configButton = document.getElementById('config-button');
    configModalOverlay = document.getElementById('config-modal-overlay');
    configModal = document.getElementById('config-modal');
    configRepsOnErrorInput = document.getElementById('config-reps-on-error');
    configInitialRepsInput = document.getElementById('config-initial-reps');
    configThemeSelect = document.getElementById('config-theme-select');
    saveConfigButton = document.getElementById('save-config-button');
    closeModalButton = document.getElementById('close-config-modal-button');
    closeModalXButton = document.getElementById('close-modal-x');

    if (!quizDiv || !statusMessageDiv || !fileInput || !csvFileInput || !quizContainerDiv ||
        !timeProgressDiv || !timeBarDiv || !timeRemainingSpan || !collectionSelect ||
        !changeCollectionButton || !collectionModalOverlay || !collectionModal || !confirmCollectionButton ||
        !configButton || !configModalOverlay || !configModal || !configRepsOnErrorInput ||
        !configInitialRepsInput || !configThemeSelect || !saveConfigButton || !closeModalButton || !closeModalXButton) {
        console.error("Error: No se encontraron elementos esenciales del DOM (quiz, status, inputs, o elementos del modal).");
        if(quizDiv) quizDiv.innerHTML = "<p class='error-message'>Error crítico: Faltan elementos HTML esenciales para el quiz o la configuración.</p>";
        return;
    }

    loadQuizConfig(); // Cargar configuración guardada
    applyTheme(themeMode); // Aplicar el tema al iniciar
    setupEventListeners(); // Configurar listeners de botones generales y del modal

    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    loadCollections();

    window.addEventListener('beforeunload', saveState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    autosaveIntervalId = setInterval(saveState, 10000);
});

function setupEventListeners() {
    // Botones principales
    document.getElementById('save-progress')?.addEventListener('click', saveProgressToFile);
    document.getElementById('load-progress')?.addEventListener('click', loadProgressFromFile);
    document.getElementById('load-csv-button')?.addEventListener('click', () => csvFileInput.click());
    document.getElementById('reset-progress-button')?.addEventListener('click', resetCurrentProgress);
    configButton?.addEventListener('click', openConfigModal);

    // Inputs de archivo
    fileInput.addEventListener('change', handleProgressFileSelect);
    csvFileInput.addEventListener('change', handleCsvFileSelect);
    collectionSelect.addEventListener('change', handleCollectionChange);
    changeCollectionButton?.addEventListener('click', openCollectionModal);
    confirmCollectionButton?.addEventListener('click', confirmCollectionSelection);
    collectionModalOverlay?.addEventListener('click', function(event){
        if(event.target === collectionModalOverlay) closeCollectionModal();
    });

    // Botones y overlay del modal de configuración
    saveConfigButton?.addEventListener('click', handleSaveConfig);
    closeModalButton?.addEventListener('click', closeConfigModal);
    closeModalXButton?.addEventListener('click', closeConfigModal);
    configModalOverlay?.addEventListener('click', function(event) {
        if (event.target === configModalOverlay) { // Solo cerrar si se hace clic en el overlay, no en el contenido del modal
            closeConfigModal();
        }
    });
}

// --- Carga de Datos (CSV y Estado) ---

function loadInitialCSV(filePath) {
    showStatusMessage("Cargando preguntas...", "info");
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(data => {
            resetQuizState(true); // Limpiar estado en memoria pero conservar localStorage
            parseCSV(data);
            if (questions.length > 0) {
                initializeQuiz();
                hideStatusMessage();
            } else {
                showStatusMessage("Error: El archivo CSV está vacío o no contiene preguntas válidas.", "error");
                 if (quizContainerDiv) quizContainerDiv.classList.add('incorrect-answer-border'); // Indicar error visualmente
            }
        })
        .catch(error => {
            console.error('Error al cargar el archivo CSV inicial:', error);
            showStatusMessage(`Error al cargar ${filePath}: ${error.message}. Asegúrate de que el archivo existe y es accesible.`, "error");
            quizDiv.innerHTML = `<p class='error-message'>No se pudieron cargar las preguntas iniciales.</p>`;
             if (quizContainerDiv) quizContainerDiv.classList.add('incorrect-answer-border'); // Indicar error visualmente
        });
}

async function loadCollections() {
    showStatusMessage('Cargando colecciones...', 'info');
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/colecciones?select=*`, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });
        const data = await res.json();
        availableCollections = data;
        collectionSelect.innerHTML = '';
        availableCollections.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nombre;
            collectionSelect.appendChild(opt);
        });
        customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = 'Personalizado';
        customOption.disabled = true;
        collectionSelect.appendChild(customOption);

        const saved = localStorage.getItem(COLLECTION_STORAGE_KEY);
        const pathId = getCollectionIdFromPath();

        if (pathId) {
            if (pathId === 'custom') {
                if (!customOption.disabled && saved === 'custom') {
                    collectionSelect.value = 'custom';
                    updateUrlForCollection('custom', true);
                } else {
                    updateUrlForCollection(null, true);
                    openCollectionModal();
                }
            } else if (availableCollections.some(c => c.id === pathId)) {
                collectionSelect.value = pathId;
                localStorage.setItem(COLLECTION_STORAGE_KEY, pathId);
                updateUrlForCollection(pathId, true);
                await loadQuestionsFromCollection(pathId);
                return;
            } else {
                updateUrlForCollection(null, true);
                openCollectionModal();
            }
        } else if (saved && collectionSelect.querySelector(`option[value="${saved}"]`)) {
            collectionSelect.value = saved;
            updateUrlForCollection(saved, true);
            if (saved !== 'custom') {
                await loadQuestionsFromCollection(saved);
            }
        } else if (availableCollections.length > 0) {
            collectionSelect.value = availableCollections[0].id;
            updateUrlForCollection(null, true);
            openCollectionModal();
        } else {
            updateUrlForCollection(null, true);
            openCollectionModal();
        }
    } catch (e) {
        console.error('Error al cargar colecciones:', e);
        showStatusMessage('Error al cargar colecciones', 'error');
    }
}

async function loadQuestionsFromCollection(id) {
    showStatusMessage('Cargando preguntas...', 'info');
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/preguntas?select=*&coleccion_id=eq.${id}`, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });
        const data = await res.json();
        resetQuizState(true);
        data.forEach(row => {
            const correct = [row.opcion_correcta_1, row.opcion_correcta_2, row.opcion_correcta_3].filter(Boolean);
            const incorrect = [row.opcion_incorrecta_1, row.opcion_incorrecta_2, row.opcion_incorrecta_3].filter(Boolean);
            const isWritten = correct.length === 1 && incorrect.length === 0;
            questions.push({
                pregunta: row.pregunta,
                correctAnswers: correct,
                incorrectAnswers: incorrect,
                explicacion: row.explicacion || '',
                isWritten: isWritten
            });
        });
        totalQuestions = questions.length;
        if (questions.length > 0) {
            initializeQuiz();
            hideStatusMessage();
        } else {
            showStatusMessage('La colección seleccionada no tiene preguntas.', 'error');
        }
    } catch (e) {
        console.error('Error al cargar preguntas de Supabase:', e);
        showStatusMessage('Error al cargar preguntas.', 'error');
    }
}

function handleCollectionChange() {
    // La carga se confirma con el botón en el modal
}

function openCollectionModal() {
    updateUrlForCollection(null, true);
    if (collectionModalOverlay) collectionModalOverlay.classList.remove('hidden');
}

function closeCollectionModal() {
    if (collectionModalOverlay) collectionModalOverlay.classList.add('hidden');
}

function confirmCollectionSelection() {
    const id = collectionSelect.value;
    if (id !== 'custom') {
        localStorage.setItem(COLLECTION_STORAGE_KEY, id);
        updateUrlForCollection(id);
        loadQuestionsFromCollection(id);
    } else {
        localStorage.setItem(COLLECTION_STORAGE_KEY, 'custom');
        updateUrlForCollection('custom');
    }
    closeCollectionModal();
}

function parseCSV(data) {
    // questions ya debería estar vacío por resetQuizState
    let parsedData = Papa.parse(data, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        transform: value => value ? value.trim() : "" // Asegurar que trim no se llame en null/undefined
    });

    if (parsedData.errors.length > 0) {
        console.warn("Errores durante el parseo del CSV:", parsedData.errors);
        // Mostrar un mensaje más específico sobre errores de parseo
        const errorDetails = parsedData.errors.map(err => `Fila ${err.row + 2}: ${err.message}`).join('<br>');
         showStatusMessage(`Se encontraron problemas al leer el CSV:<br>${errorDetails}`, "error", 10000); // Mostrar por 10s
    }

    parsedData.data.forEach((row, index) => {
        let pregunta = row['Pregunta'];
        let explicacion = row['Explicación'] || "";

        if (!pregunta) {
            console.warn(`Fila ${index + 2} omitida: Falta la pregunta.`);
            return;
        }

        let correctAnswers = [
            row['Opción correcta 1'],
            row['Opción Correcta 2'],
            row['Opción Correcta 3']
        ].filter(ans => ans && ans !== '');

        let incorrectAnswers = [
            row['Opción Incorrecta 1'],
            row['Opción Incorrecta 2'],
            row['Opción Incorrecta 3']
        ].filter(ans => ans && ans !== '');

        if (correctAnswers.length === 0) {
            console.warn(`Fila ${index + 2} ('${pregunta}') omitida: No se definió ninguna opción correcta.`);
            return;
        }

        const isWritten = correctAnswers.length === 1 && incorrectAnswers.length === 0;
        questions.push({
            pregunta: pregunta,
            correctAnswers: correctAnswers,
            incorrectAnswers: incorrectAnswers,
            explicacion: explicacion,
            isWritten: isWritten
        });
    });
    totalQuestions = questions.length;
    console.log(`Se parsearon ${totalQuestions} preguntas.`);
}

// --- Lógica del Quiz ---

function initializeQuiz() {
    loadState(); // Intentar cargar estado guardado (localStorage o archivo)

    let statsNeedInitialization = !questionStats || Object.keys(questionStats).length === 0;

    // Sincronizar stats con las preguntas actuales
    const currentQuestionIndices = new Set(questions.map((_, index) => index.toString()));
    const statsIndices = Object.keys(questionStats);

    // Añadir stats para preguntas nuevas o faltantes
    questions.forEach((_, index) => {
        const idxStr = index.toString();
        if (!questionStats[idxStr] || typeof questionStats[idxStr].repetitionsRemaining !== 'number') {
            questionStats[idxStr] = {
                repetitionsRemaining: configInitialRepetitions,
                lastAskedAt: null,
                lastErrorAt: null,
                avgTime: avgTimePerRep
            };
            statsNeedInitialization = true;
        }
    });

    // Eliminar stats de preguntas que ya no existen
    statsIndices.forEach(index => {
        if (!currentQuestionIndices.has(index)) {
            delete questionStats[index];
            statsNeedInitialization = true;
        }
    });

    // Construir o validar la cola
    if (!questionQueue || questionQueue.length === 0 || statsNeedInitialization) {
        if (questionQueue && questionQueue.length > 0) {
            // Filtrar cola cargada para remover índices inválidos o completados
            questionQueue = questionQueue.filter(index =>
                questionStats[index] && questionStats[index].repetitionsRemaining > 0
            );
        }
        // Si la cola está vacía después de filtrar o necesitaba init, reconstruir
        if (questionQueue.length === 0) {
            buildQuestionQueue();
        }
    } else {
         // Si se cargó una cola, el primer elemento es el actual
         currentQuestionIndex = questionQueue.shift();
    }


    showNextQuestion();
}

function buildQuestionQueue() {
    questionQueue = [];
    let questionsToAsk = [];

    for (let index in questionStats) {
        // Asegurar que el índice corresponde a una pregunta existente
        if (questions[parseInt(index)]) {
             let stats = questionStats[index];
             let reps = stats.repetitionsRemaining || 0;
             if (reps > 0) {
                for (let i = 0; i < reps; i++) {
                    questionsToAsk.push(parseInt(index));
                }
            }
        } else {
            console.warn(`Stat encontrado para índice de pregunta no existente: ${index}. Omitiendo.`);
             // Opcional: limpiar este stat huérfano
             // delete questionStats[index];
        }
    }

    questionQueue = shuffleArray(questionsToAsk);
    console.log("Nueva cola de preguntas construida:", questionQueue);
}

function showNextQuestion() {
    isMultiSelectMode = false;
    resetKeyListener();

    // **NUEVO**: Limpiar borde del contenedor al mostrar nueva pregunta
    if (quizContainerDiv) {
        quizContainerDiv.classList.remove('correct-answer-border', 'incorrect-answer-border');
    }

    if (questionQueue.length === 0) {
        buildQuestionQueue();
        if (questionQueue.length === 0) {
            showCompletionMessage();
            return;
        }
    }

    currentQuestionIndex = questionQueue.shift();

    if (currentQuestionIndex === undefined || !questions[currentQuestionIndex] || !questionStats[currentQuestionIndex]) {
        console.error(`Índice de pregunta inválido o faltante: ${currentQuestionIndex}. Intentando siguiente.`);
        showNextQuestion(); // Intentar con el siguiente de la cola
        return;
    }

    if (initialTotalRepetitions === 0) {
        initialTotalRepetitions = getTotalRepetitionsRemaining();
    }
    updateTimeProgress();

    displayQuestion(currentQuestionIndex);
}

function showCompletionMessage() {
    quizDiv.innerHTML = '<h2 class="completed-message">¡Has concluido, has memorizado todo!</h2>';
    if (quizContainerDiv) {
        quizContainerDiv.classList.remove('incorrect-answer-border');
        quizContainerDiv.classList.add('correct-answer-border'); // Borde verde al completar
    }
    clearState(); // Limpiar estado de localStorage
    document.onkeydown = null; // Desactivar listeners de teclado
}

function displayQuestion(index) {
    let question = questions[index];
    let stats = questionStats[index];
    startQuestionTimer();
    quizDiv.innerHTML = ''; // Limpiar

    // **NUEVO**: Limpiar borde del contenedor (redundante con showNextQuestion, pero seguro)
    if (quizContainerDiv) {
        quizContainerDiv.classList.remove('correct-answer-border', 'incorrect-answer-border');
    }

    if (!question || !stats) {
        console.error(`Intento de mostrar pregunta inválida con índice ${index}`);
        showNextQuestion();
        return;
    }

    if (question.isWritten) {
        displayWrittenQuestion(index);
        return;
    }

    isMultiSelectMode = question.correctAnswers.length > 1;

    // Mostrar info de repeticiones
    let repsDiv = document.createElement('div');
    repsDiv.className = 'reps-remaining';
    repsDiv.textContent = `Repeticiones faltantes para esta pregunta: ${stats.repetitionsRemaining}`;
    quizDiv.appendChild(repsDiv);

    let remainingDiv = document.createElement('div');
    remainingDiv.className = 'questions-remaining';
    remainingDiv.textContent = `Total de repeticiones restantes: ${getTotalRepetitionsRemaining()}`;
    quizDiv.appendChild(remainingDiv);

    // Pregunta
    let questionElement = document.createElement('h2');
    questionElement.textContent = question.pregunta;
    quizDiv.appendChild(questionElement);

    // Mensaje selección múltiple
    if (isMultiSelectMode) {
        let multiSelectMsg = document.createElement('p');
        multiSelectMsg.className = 'multi-select-info';
        multiSelectMsg.textContent = 'Selecciona TODAS las opciones correctas y presiona Confirmar (o Espacio).';
        quizDiv.appendChild(multiSelectMsg);
    }

    // Opciones
    let allOptions = [...question.correctAnswers, ...question.incorrectAnswers];
    if (question.correctAnswers.length === 1 && question.incorrectAnswers.length === 1 && allOptions.length === 2) {
         allOptions = shuffleArray(allOptions);
    } else {
         allOptions = shuffleArray(allOptions);
    }


    allOptions.forEach((optionText, idx) => {
        let optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.dataset.optionText = optionText;

        let keySpan = document.createElement('span');
        keySpan.className = 'key-indicator';
        keySpan.textContent = (idx + 1).toString();
        optionDiv.appendChild(keySpan);

        let optionContent = document.createElement('span');
        optionContent.className = 'option-text';
        optionContent.textContent = optionText;
        optionDiv.appendChild(optionContent);

        if (isMultiSelectMode) {
            optionDiv.addEventListener('click', () => toggleOptionSelection(optionDiv));
        } else {
            optionDiv.addEventListener('click', () => checkSingleAnswer(optionText, index, optionDiv));
        }
        quizDiv.appendChild(optionDiv);
    });

    // Contenedor para los botones de acción (Confirmar, Saltar)
    let actionButtonContainer = document.createElement('div');
    actionButtonContainer.className = 'action-buttons-container';

    // Botón confirmar (multi-select)
    if (isMultiSelectMode) {
        let confirmButton = document.createElement('button');
        confirmButton.id = 'confirm-multi-button';
        confirmButton.className = 'confirm-button';

        let spaceSpan = document.createElement('span');
        spaceSpan.className = 'key-indicator space';
        spaceSpan.textContent = '⎵';
        confirmButton.prepend(spaceSpan);

        let buttonText = document.createElement('span');
        buttonText.className = 'button-text';
        buttonText.textContent = 'Confirmar Selección';
        confirmButton.appendChild(buttonText);

        confirmButton.addEventListener('click', () => submitMultiAnswer(index));
        actionButtonContainer.appendChild(confirmButton);
    }

    // Botón Saltar Pregunta
    let skipButton = document.createElement('button');
    skipButton.id = 'skip-question-button';
    skipButton.className = 'skip-button';
    // **NUEVO**: Añadir indicador de tecla (Backspace/Borrar)
    let backspaceSpan = document.createElement('span');
    backspaceSpan.className = 'key-indicator'; // Usar la misma clase para estilo consistente
    backspaceSpan.textContent = '⌫'; // Símbolo unicode para backspace
    backspaceSpan.style.marginRight = '8px'; // Espacio antes del texto
    skipButton.appendChild(backspaceSpan);

    let skipButtonText = document.createElement('span');
    skipButtonText.textContent = 'Saltar Pregunta';
    skipButton.appendChild(skipButtonText);

    skipButton.addEventListener('click', () => handleSkipQuestion(index));
    actionButtonContainer.appendChild(skipButton); // Añadir al contenedor

    quizDiv.appendChild(actionButtonContainer); // Añadir el contenedor de botones al quiz

    setupKeyListenerForQuestion(index, allOptions.length);
}

// --- Manejo de Respuestas ---

function toggleOptionSelection(optionDiv) {
    optionDiv.classList.toggle('selected');
}

function checkSingleAnswer(selectedOption, questionIndex, optionDiv) {
    disableOptionsAndActions();
    let question = questions[questionIndex];
    const isCorrect = question.correctAnswers[0] === selectedOption;

    stopQuestionTimer(questionIndex);

    updateStats(questionIndex, isCorrect);
    showExplanationAndNext(questionIndex, isCorrect, [selectedOption]);
}

function displayWrittenQuestion(index) {
    let question = questions[index];
    let stats = questionStats[index];

    startQuestionTimer();

    quizDiv.innerHTML = '';
    if (quizContainerDiv) {
        quizContainerDiv.classList.remove('correct-answer-border', 'incorrect-answer-border');
    }

    let repsDiv = document.createElement('div');
    repsDiv.className = 'reps-remaining';
    repsDiv.textContent = `Repeticiones faltantes para esta pregunta: ${stats.repetitionsRemaining}`;
    quizDiv.appendChild(repsDiv);

    let remainingDiv = document.createElement('div');
    remainingDiv.className = 'questions-remaining';
    remainingDiv.textContent = `Total de repeticiones restantes: ${getTotalRepetitionsRemaining()}`;
    quizDiv.appendChild(remainingDiv);

    let questionElement = document.createElement('h2');
    questionElement.textContent = question.pregunta;
    quizDiv.appendChild(questionElement);

    let input = document.createElement('input');
    input.type = 'text';
    input.id = 'written-answer-input';
    input.className = 'written-answer-input';
    quizDiv.appendChild(input);

    let actionContainer = document.createElement('div');
    actionContainer.className = 'action-buttons-container';

    let submitButton = document.createElement('button');
    submitButton.id = 'submit-written-button';
    submitButton.className = 'confirm-button';
    let buttonText = document.createElement('span');
    buttonText.className = 'button-text';
    buttonText.textContent = 'Aceptar';
    submitButton.appendChild(buttonText);
    submitButton.addEventListener('click', () => submitWrittenAnswer(index));
    actionContainer.appendChild(submitButton);

    // Botón para saltar la pregunta
    let skipButton = document.createElement('button');
    skipButton.id = 'skip-question-button';
    skipButton.className = 'skip-button';
    let delSpan = document.createElement('span');
    delSpan.className = 'key-indicator';
    delSpan.textContent = '⇧⌦';
    delSpan.style.marginRight = '8px';
    skipButton.appendChild(delSpan);
    let skipText = document.createElement('span');
    skipText.textContent = 'Saltar Pregunta';
    skipButton.appendChild(skipText);
    skipButton.addEventListener('click', () => handleSkipQuestion(index));
    actionContainer.appendChild(skipButton);

    quizDiv.appendChild(actionContainer);

    // Posicionar cursor inmediatamente en el cuadro de texto
    setTimeout(() => input.focus(), 0);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitButton.click();
        }
    });

    setupKeyListenerForWritten(index);
}

function submitWrittenAnswer(questionIndex) {
    let input = document.getElementById('written-answer-input');
    let submitButton = document.getElementById('submit-written-button');
    if (input) input.disabled = true;
    if (submitButton) submitButton.disabled = true;
    resetKeyListener();

    let userAnswer = input ? input.value : '';
    let question = questions[questionIndex];
    let isCorrect = fuzzyCompare(userAnswer, question.correctAnswers[0]);

    stopQuestionTimer(questionIndex);

    updateStats(questionIndex, isCorrect);
    showWrittenExplanation(questionIndex, isCorrect, userAnswer);
}

function showWrittenExplanation(questionIndex, isCorrect, userAnswer) {
    let question = questions[questionIndex];
    quizDiv.innerHTML = '';

    if (quizContainerDiv) {
        quizContainerDiv.classList.remove('correct-answer-border', 'incorrect-answer-border');
        quizContainerDiv.classList.add(isCorrect ? 'correct-answer-border' : 'incorrect-answer-border');
    }

    let questionElement = document.createElement('h2');
    questionElement.textContent = question.pregunta;
    quizDiv.appendChild(questionElement);

    let yourAnswerDiv = document.createElement('div');
    yourAnswerDiv.className = 'selected-answers-display';
    let title = document.createElement('p');
    title.textContent = 'Tu respuesta:';
    yourAnswerDiv.appendChild(title);
    let ans = document.createElement('div');
    ans.className = 'selected-option-display';
    ans.textContent = userAnswer || '(Sin respuesta)';
    ans.classList.add(isCorrect ? 'correct-selection' : 'incorrect-selection');
    yourAnswerDiv.appendChild(ans);
    quizDiv.appendChild(yourAnswerDiv);

    let correctDiv = document.createElement('div');
    correctDiv.className = 'missed-correct-answers-display';
    let pt = document.createElement('p');
    pt.textContent = 'Respuesta correcta (ideal):';
    correctDiv.appendChild(pt);
    let val = document.createElement('div');
    val.className = 'unselected-correct-option';
    val.textContent = question.correctAnswers[0];
    correctDiv.appendChild(val);
    quizDiv.appendChild(correctDiv);

    if (question.explicacion && question.explicacion.trim() !== '') {
        let contextDiv = document.createElement('div');
        contextDiv.className = 'context-info';
        contextDiv.textContent = question.explicacion;
        quizDiv.appendChild(contextDiv);
    }

    let nextButton = document.createElement('button');
    nextButton.id = 'next-button';
    nextButton.className = 'next-button';
    let spaceSpan = document.createElement('span');
    spaceSpan.className = 'key-indicator space';
    spaceSpan.textContent = '⎵';
    let nextContent = document.createElement('span');
    nextContent.className = 'button-text';
    nextContent.textContent = 'Siguiente';
    nextButton.appendChild(spaceSpan);
    nextButton.appendChild(nextContent);
    nextButton.addEventListener('click', () => {
        saveState();
        showNextQuestion();
    });
    quizDiv.appendChild(nextButton);

    updateTimeProgress();

    setupKeyListenerForNext();
}

function submitMultiAnswer(questionIndex) {
    disableOptionsAndActions();
    let question = questions[questionIndex];
    let selectedOptions = [];
    document.querySelectorAll('.option.selected').forEach(div => {
        selectedOptions.push(div.dataset.optionText);
    });

    const selectedSet = new Set(selectedOptions);
    const correctSet = new Set(question.correctAnswers);
    const isCorrect = selectedSet.size === correctSet.size &&
                      [...selectedSet].every(value => correctSet.has(value));

    stopQuestionTimer(questionIndex);

    updateStats(questionIndex, isCorrect);
    showExplanationAndNext(questionIndex, isCorrect, selectedOptions);
}

function handleSkipQuestion(questionIndex) {
    console.log(`Skipping question index: ${questionIndex}`);
    disableOptionsAndActions();

    stopQuestionTimer(questionIndex);

    if (!questionStats[questionIndex]) {
        console.error("Intentando saltar pregunta con stats inválidos:", questionIndex);
        showNextQuestion();
        return;
    }

    questionStats[questionIndex].repetitionsRemaining = Math.max(0, questionStats[questionIndex].repetitionsRemaining - 1);
    questionStats[questionIndex].lastAskedAt = Date.now();

    saveState();
    showNextQuestion();
    showStatusMessage("Pregunta saltada. Un intento reducido.", "info", 1500);
}


function updateStats(questionIndex, isCorrect) {
    if (!questionStats[questionIndex]) {
        console.error("Intentando actualizar stats para índice inválido:", questionIndex);
        return;
    }
    if (isCorrect) {
        questionStats[questionIndex].repetitionsRemaining = Math.max(0, questionStats[questionIndex].repetitionsRemaining - 1);
    } else {
        questionStats[questionIndex].repetitionsRemaining += configRepetitionsOnError;
        questionStats[questionIndex].lastErrorAt = Date.now();
    }
    questionStats[questionIndex].lastAskedAt = Date.now();
}

// **MODIFICADO**: Para añadir borde al contenedor y mostrar correctas no seleccionadas
function showExplanationAndNext(questionIndex, isCorrect, userSelections) {
    let question = questions[questionIndex];
    const userSelectionsSet = new Set(userSelections); // Convertir a Set para búsquedas rápidas

    // **NUEVO**: Aplicar borde al contenedor principal
    if (quizContainerDiv) {
        quizContainerDiv.classList.remove('correct-answer-border', 'incorrect-answer-border'); // Limpiar primero
        quizContainerDiv.classList.add(isCorrect ? 'correct-answer-border' : 'incorrect-answer-border');
    }

    if (isMultiSelectMode && !isCorrect) {
        const banner = document.createElement('div');
        banner.className = 'answer-banner error-banner';
        const icon = document.createElement('span');
        icon.className = 'warning-icon';
        icon.textContent = '⚠';
        const msg = document.createElement('span');
        msg.textContent = 'Respuesta incorrecta: no seleccionaste todas las opciones correctas.';
        banner.appendChild(icon);
        banner.appendChild(msg);
        quizDiv.insertBefore(banner, quizDiv.firstChild);
    }

    // --- 1. Mostrar Selecciones del Usuario ---
    const selectionsDisplayDiv = document.createElement('div');
    selectionsDisplayDiv.className = 'selected-answers-display';
    const selectionsTitle = document.createElement('p');
    selectionsTitle.textContent = 'Tu selección:';
    selectionsDisplayDiv.appendChild(selectionsTitle);

    let allOptionDivs = document.querySelectorAll('.option');
     allOptionDivs.forEach(div => {
         div.classList.add('hidden');
     });

    const actionContainer = quizDiv.querySelector('.action-buttons-container');
    if (actionContainer) {
        actionContainer.style.display = 'none';
    }

    if (userSelections && userSelections.length > 0) {
        userSelections.forEach(selectionText => {
            const selectionDiv = document.createElement('div');
            // Añadir clase base y clase específica (correcta/incorrecta)
            selectionDiv.className = 'selected-option-display';
            selectionDiv.textContent = selectionText;
            if (question.correctAnswers.includes(selectionText)) {
                if (isCorrect) {
                    selectionDiv.classList.add('correct-selection');
                } else {
                    selectionDiv.classList.add('partial-correct-selection');
                }
            } else {
                selectionDiv.classList.add('incorrect-selection');
            }
            selectionsDisplayDiv.appendChild(selectionDiv);
        });
    } else {
        const noSelectionSpan = document.createElement('span');
        noSelectionSpan.textContent = '(No seleccionaste ninguna opción)';
        noSelectionSpan.style.fontStyle = 'italic';
        selectionsDisplayDiv.appendChild(noSelectionSpan);
    }

    // Insertar bloque de selecciones
     let lastHeaderElement = quizDiv.querySelector('.multi-select-info') || quizDiv.querySelector('h2');
     let anchorElement = lastHeaderElement ? lastHeaderElement.nextSibling : quizDiv.firstChild;
     quizDiv.insertBefore(selectionsDisplayDiv, anchorElement);
     anchorElement = selectionsDisplayDiv; // Actualizar ancla


    // --- 2. Mostrar Correctas NO Seleccionadas ---
    let missedCorrectAnswers = [];
    if (isMultiSelectMode || !isCorrect) { // Mostrar si es multiselect O si es single y falló
         question.correctAnswers.forEach(correctAnswer => {
             if (!userSelectionsSet.has(correctAnswer)) {
                 missedCorrectAnswers.push(correctAnswer);
             }
         });
     }

    if (missedCorrectAnswers.length > 0) {
        const missedDisplayDiv = document.createElement('div');
        missedDisplayDiv.className = 'missed-correct-answers-display'; // Contenedor opcional
        const missedTitle = document.createElement('p');
        // Título diferente si la respuesta general fue correcta pero incompleta
        missedTitle.textContent = isCorrect ? 'Otras opciones correctas:' : 'Correcta(s) no seleccionada(s):';
        missedDisplayDiv.appendChild(missedTitle);

        missedCorrectAnswers.forEach(missedText => {
            const missedDiv = document.createElement('div');
            missedDiv.className = 'unselected-correct-option'; // Clase específica
            missedDiv.textContent = missedText;
            missedDisplayDiv.appendChild(missedDiv);
        });

        // Insertar después del bloque de selecciones
        anchorElement.parentNode.insertBefore(missedDisplayDiv, anchorElement.nextSibling);
        anchorElement = missedDisplayDiv; // Actualizar ancla
    }


    // --- 3. Mostrar Respuesta(s) Correcta(s) si fue incorrecta (redundante si ya mostramos arriba?) ---
    //    Quizás solo mostrarlo si NO es multiselect y falló. O quitarlo si la sección 2 ya lo cubre.
    //    Vamos a mantenerlo simple y quitar la sección original de "La respuesta correcta es..."
    //    si la sección "Correcta(s) no seleccionada(s)" ya lo cubre.
    //
    // if (!isCorrect && !isMultiSelectMode) { // Solo si es incorrecta Y single select
    //     let correctAnswerDiv = document.createElement('div');
    //     correctAnswerDiv.className = 'correct-answer-info'; // Podríamos reutilizar estilo
    //     correctAnswerDiv.innerHTML = `La respuesta correcta es: <strong>${question.correctAnswers[0]}</strong>`;
    //     anchorElement.parentNode.insertBefore(correctAnswerDiv, anchorElement.nextSibling);
    //     anchorElement = correctAnswerDiv;
    // }


    // --- 4. Mostrar Explicación ---
    if (question.explicacion && question.explicacion.trim() !== "") {
        let contextDiv = document.createElement('div');
        contextDiv.className = 'context-info';
        contextDiv.textContent = question.explicacion;
        anchorElement.parentNode.insertBefore(contextDiv, anchorElement.nextSibling);
         anchorElement = contextDiv;
    }

    // --- 5. Botón Siguiente ---
    let nextButton = document.createElement('button');
    nextButton.id = 'next-button';
    nextButton.className = 'next-button';

    let spaceSpan = document.createElement('span');
    spaceSpan.className = 'key-indicator space';
    spaceSpan.textContent = '⎵';

    let nextButtonContent = document.createElement('span');
    nextButtonContent.className = 'button-text';
    nextButtonContent.textContent = 'Siguiente';

    nextButton.appendChild(spaceSpan);
    nextButton.appendChild(nextButtonContent);

    nextButton.addEventListener('click', () => {
        saveState();
        showNextQuestion();
    });

    quizDiv.appendChild(nextButton); // Añadir siempre al final

    updateTimeProgress();

    setupKeyListenerForNext();
}


// --- Manejo de Teclado ---

function disableOptionsAndActions() {
    document.querySelectorAll('.option').forEach(opt => {
        if (!opt.classList.contains('disabled')) {
            const clone = opt.cloneNode(true);
            clone.classList.add('disabled');
            opt.parentNode.replaceChild(clone, opt);
        }
    });
    document.querySelectorAll('.confirm-button, .skip-button').forEach(button => {
        button.disabled = true;
    });
    let textInput = document.getElementById('written-answer-input');
    let textButton = document.getElementById('submit-written-button');
    if (textInput) textInput.disabled = true;
    if (textButton) textButton.disabled = true;
    resetKeyListener();
}

// **MODIFICADO**: Añadir listener para Backspace
function setupKeyListenerForQuestion(questionIndex, numOptions) {
    document.onkeydown = function(e) {
        // Evitar acciones si ya están deshabilitadas
        if (document.querySelector('.option.disabled') || document.querySelector('.skip-button:disabled')) return;

        if (e.key >= '1' && e.key <= numOptions.toString()) {
            e.preventDefault();
            let optionIndex = parseInt(e.key) - 1;
            let optionDivs = document.querySelectorAll('.option:not(.disabled)');
            if (optionDivs[optionIndex]) {
                if (isMultiSelectMode) {
                    toggleOptionSelection(optionDivs[optionIndex]);
                } else {
                    optionDivs[optionIndex].click();
                }
            }
        } else if (e.code === 'Space' || e.key === ' ') { // Añadir e.key === ' ' para compatibilidad
             e.preventDefault();
            if (isMultiSelectMode) {
                let confirmButton = document.getElementById('confirm-multi-button');
                if (confirmButton && !confirmButton.disabled) {
                    confirmButton.click();
                }
            }
        } else if (e.key === 'Backspace') { // **NUEVO**: Detectar Backspace
            e.preventDefault(); // Prevenir navegación atrás
            const skipButton = document.getElementById('skip-question-button');
            if (skipButton && !skipButton.disabled) {
                skipButton.click(); // Simular clic en el botón de saltar
            }
        }
    }
}

function setupKeyListenerForWritten(questionIndex) {
    document.onkeydown = function(e) {
        if (document.getElementById('submit-written-button')?.disabled) return;
        if ((e.key === 'Delete' || e.key === 'Backspace') && e.shiftKey) {
            e.preventDefault();
            const skipButton = document.getElementById('skip-question-button');
            if (skipButton && !skipButton.disabled) {
                skipButton.click();
            }
        }
    }
}

function setupKeyListenerForNext() {
    document.onkeydown = function(e) {
        if (e.code === 'Space' || e.key === ' ') { // Añadir e.key === ' '
            e.preventDefault();
            let nextButton = document.getElementById('next-button');
            if (nextButton) {
                nextButton.click();
            }
        }
    }
}

function resetKeyListener() {
    document.onkeydown = null;
}

// --- Funciones Auxiliares ---

function handleVisibilityChange() {
    if (!questionStartTime) return;
    if (document.visibilityState === 'hidden') {
        if (questionVisibleStartTime !== null) {
            accumulatedVisibleTime += Date.now() - questionVisibleStartTime;
            questionVisibleStartTime = null;
        }
        saveState();
    } else if (document.visibilityState === 'visible') {
        if (questionVisibleStartTime === null) {
            questionVisibleStartTime = Date.now();
        }
    }
}

function startQuestionTimer() {
    questionStartTime = Date.now();
    accumulatedVisibleTime = 0;
    questionVisibleStartTime = document.visibilityState === 'visible' ? Date.now() : null;
}

function stopQuestionTimer(qIndex) {
    if (!questionStartTime) return;
    if (questionVisibleStartTime !== null) {
        accumulatedVisibleTime += Date.now() - questionVisibleStartTime;
        questionVisibleStartTime = null;
    }
    const delta = accumulatedVisibleTime / 1000;
    questionStartTime = null;
    accumulatedVisibleTime = 0;

    if (typeof qIndex === 'number' && questionStats[qIndex]) {
        const prev = questionStats[qIndex].avgTime || avgTimePerRep;
        questionStats[qIndex].avgTime = EMA_ALPHA * delta + (1 - EMA_ALPHA) * prev;
    }
    avgTimePerRep = EMA_ALPHA * delta + (1 - EMA_ALPHA) * avgTimePerRep;
}

function updateTimeProgress() {
    if (!timeBarDiv || !timeRemainingSpan) return;
    const T = getTotalRepetitionsRemaining();

    if (initialTotalRepetitions === 0) {
        initialTotalRepetitions = T;
    }

    const progress = initialTotalRepetitions === 0 ? 1 :
        (initialTotalRepetitions - T) / initialTotalRepetitions;
    timeBarDiv.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;

    if (T === 0) {
        timeRemainingSpan.textContent = `0 min restantes`;
        return;
    }

    let secondsRemaining = 0;
    for (const [idx, stat] of Object.entries(questionStats)) {
        if (stat.repetitionsRemaining === 0) continue;
        let k = 1.0;
        const q = questions[idx];
        if (q.isWritten) k *= 1.4;
        else if (q.correctAnswers.length > 1) k *= 1.25;
        if (Date.now() - (stat.lastErrorAt || 0) < 180000) k *= 1.15;
        if (stat.repetitionsRemaining > configInitialRepetitions) k *= 1.10;
        const avg = stat.avgTime || avgTimePerRep;
        secondsRemaining += k * avg * stat.repetitionsRemaining;
    }
    const minutes = Math.ceil(secondsRemaining / 60);
    timeRemainingSpan.textContent = `${minutes} min restantes`;
}

function getTotalRepetitionsRemaining() {
    return Object.values(questionStats).reduce((sum, stats) => sum + (stats?.repetitionsRemaining || 0), 0);
}

function shuffleArray(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

function normalizeAnswer(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,;:¿?¡!]/g, '')
        .trim();
}

function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function fuzzyCompare(a, b) {
    const normA = normalizeAnswer(a);
    const normB = normalizeAnswer(b);
    if (normA.length === 0 && normB.length === 0) return true;
    const distance = levenshtein(normA, normB);
    const similarity = 1 - distance / Math.max(normA.length, normB.length);
    return similarity >= 0.85;
}

function showStatusMessage(message, type = "info", duration = 3000) {
    if (!statusMessageDiv) return;
     if (statusMessageDiv.timer) clearTimeout(statusMessageDiv.timer); // Limpiar timeout anterior si existe

    statusMessageDiv.textContent = message;
    statusMessageDiv.className = `status-message ${type}`;
    statusMessageDiv.style.display = 'block';

    if (type !== 'error' || duration > 0) {
         statusMessageDiv.timer = setTimeout(() => {
             if (statusMessageDiv.textContent === message) {
                hideStatusMessage();
             }
         }, duration);
     }
}

function hideStatusMessage() {
     if (!statusMessageDiv) return;
      if (statusMessageDiv.timer) {
         clearTimeout(statusMessageDiv.timer);
         statusMessageDiv.timer = null;
     }
     statusMessageDiv.style.display = 'none';
     statusMessageDiv.textContent = '';
     statusMessageDiv.className = 'status-message';
}

// --- Funciones de Estado y Progreso ---

function saveState() {
    const queueToSave = currentQuestionIndex !== null && currentQuestionIndex !== undefined ? [currentQuestionIndex, ...questionQueue] : [...questionQueue];
    let state = {
        questionStats: questionStats,
        questionQueue: queueToSave,
        avgTimePerRep: avgTimePerRep,
        initialTotalRepetitions: initialTotalRepetitions
    };
    try {
        localStorage.setItem('quizState', JSON.stringify(state));
    } catch (e) {
        console.error("Error al guardar estado en localStorage:", e);
        showStatusMessage("Error al guardar el progreso automáticamente.", "error");
    }
}

function loadState() {
    let stateJSON = localStorage.getItem('quizState');
    if (stateJSON) {
        try {
            let state = JSON.parse(stateJSON);
            if (state.questionStats && typeof state.questionStats === 'object' && state.questionQueue && Array.isArray(state.questionQueue)) {
                questionStats = state.questionStats;
                questionQueue = state.questionQueue;
                if (typeof state.avgTimePerRep === 'number') {
                    avgTimePerRep = state.avgTimePerRep;
                }
                if (typeof state.initialTotalRepetitions === 'number') {
                    initialTotalRepetitions = state.initialTotalRepetitions;
                } else {
                    initialTotalRepetitions = getTotalRepetitionsRemaining();
                }
                for (const key of Object.keys(questionStats)) {
                    if (typeof questionStats[key].avgTime !== 'number') {
                        questionStats[key].avgTime = avgTimePerRep;
                    }
                }
                console.log("Estado cargado desde localStorage.");
                return true;
            } else {
                console.warn("Estado en localStorage inválido. Ignorando.");
                clearState();
            }
        } catch (error) {
            console.error('Error al parsear estado de localStorage:', error);
            clearState();
        }
    }
     questionStats = {};
     questionQueue = [];
     currentQuestionIndex = null;
     return false;
}

function clearState() {
    localStorage.removeItem('quizState');
    console.log("Estado de localStorage limpiado.");
}

function resetQuizState(preserveLocalStorage = false) {
    questions = [];
    questionStats = {};
    questionQueue = [];
    currentQuestionIndex = null;
    totalQuestions = 0;
    isMultiSelectMode = false;
    initialTotalRepetitions = 0;
    if (!preserveLocalStorage) {
        clearState();
    }
    resetKeyListener();
    // Limpiar borde del contenedor si se reinicia
    if (quizContainerDiv) {
        quizContainerDiv.classList.remove('correct-answer-border', 'incorrect-answer-border');
    }
    console.log("Estado completo del quiz reiniciado.");
}

// --- Manejadores de Botones de Control ---

function saveProgressToFile() {
    if (questions.length === 0) {
         showStatusMessage("No hay preguntas cargadas para guardar progreso.", "error");
         return;
     }
    const queueToSave = currentQuestionIndex !== null && currentQuestionIndex !== undefined ? [currentQuestionIndex, ...questionQueue] : [...questionQueue];
    let state = {
        questionStats: questionStats,
        questionQueue: queueToSave,
        avgTimePerRep: avgTimePerRep,
        initialTotalRepetitions: initialTotalRepetitions
    };
    let stateJSON = JSON.stringify(state, null, 2);
    let blob = new Blob([stateJSON], { type: "application/json;charset=utf-8" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement('a');
    a.href = url;
    a.download = 'quizProgress.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Progreso guardado en archivo.");
    showStatusMessage("Progreso guardado en 'quizProgress.json'.", "success");
}

function loadProgressFromFile() {
    if (questions.length === 0) {
         showStatusMessage("Carga primero un archivo CSV antes de cargar progreso.", "error");
         return;
     }
    fileInput.click();
}

function handleProgressFileSelect(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let state = JSON.parse(e.target.result);
            if (state.questionStats && typeof state.questionStats === 'object' && state.questionQueue && Array.isArray(state.questionQueue)) {
                questionStats = state.questionStats;
                questionQueue = state.questionQueue;
                if (typeof state.avgTimePerRep === 'number') {
                    avgTimePerRep = state.avgTimePerRep;
                }
                if (typeof state.initialTotalRepetitions === 'number') {
                    initialTotalRepetitions = state.initialTotalRepetitions;
                } else {
                    initialTotalRepetitions = getTotalRepetitionsRemaining();
                }
                for (const key of Object.keys(questionStats)) {
                    if (typeof questionStats[key].avgTime !== 'number') {
                        questionStats[key].avgTime = avgTimePerRep;
                    }
                }
                currentQuestionIndex = null;
                saveState();
                initializeQuiz();
                showStatusMessage("Progreso cargado desde archivo.", "success");
            } else {
                throw new Error("Formato de archivo de progreso inválido.");
            }
        } catch (error) {
            console.error("Error al cargar/parsear archivo de progreso:", error);
            showStatusMessage(`Error al cargar progreso: ${error.message}`, "error");
            if (quizContainerDiv) quizContainerDiv.classList.add('incorrect-answer-border'); // Indicar error visual
        } finally {
            fileInput.value = "";
        }
    };
    reader.onerror = function() {
        console.error("Error al leer el archivo de progreso:", reader.error);
        showStatusMessage("No se pudo leer el archivo seleccionado.", "error");
        if (quizContainerDiv) quizContainerDiv.classList.add('incorrect-answer-border'); // Indicar error visual
        fileInput.value = "";
    };
    reader.readAsText(file);
}


function handleCsvFileSelect(event) {
    let file = event.target.files[0];
    if (!file) return;

    showStatusMessage(`Cargando ${file.name}...`, "info");
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = e.target.result;
            resetQuizState();
            parseCSV(csvData);

            if (questions.length > 0) {
                initializeQuiz();
                hideStatusMessage();
                showStatusMessage(`¡CSV '${file.name}' cargado exitosamente!`, "success");
            } else {
                 showStatusMessage(`Error: El archivo CSV '${file.name}' está vacío o no contiene preguntas válidas.`, "error");
                 quizDiv.innerHTML = `<p class='error-message'>El archivo CSV cargado no es válido.</p>`;
                  if (quizContainerDiv) quizContainerDiv.classList.add('incorrect-answer-border'); // Indicar error visual
            }

        } catch (error) {
            console.error("Error al parsear el nuevo archivo CSV:", error);
            showStatusMessage(`Error al procesar ${file.name}: ${error.message}`, "error");
            resetQuizState();
            quizDiv.innerHTML = `<p class='error-message'>Error al cargar el nuevo archivo CSV.</p>`;
             if (quizContainerDiv) quizContainerDiv.classList.add('incorrect-answer-border'); // Indicar error visual
        } finally {
            csvFileInput.value = "";
            if (collectionSelect) {
                if (customOption) customOption.disabled = false;
                collectionSelect.value = 'custom';
                localStorage.setItem(COLLECTION_STORAGE_KEY, 'custom');
                updateUrlForCollection('custom');
            }
        }
    };
    reader.onerror = function() {
        console.error("Error al leer el archivo CSV:", reader.error);
        showStatusMessage("No se pudo leer el archivo CSV seleccionado.", "error");
        if (quizContainerDiv) quizContainerDiv.classList.add('incorrect-answer-border'); // Indicar error visual
        csvFileInput.value = "";
    };
    reader.readAsText(file);
}

function resetCurrentProgress() {
    if (questions.length === 0) {
        showStatusMessage("No hay preguntas cargadas para reiniciar.", "error");
        return;
    }

    if (confirm("¿Estás seguro de que quieres reiniciar todo el progreso para las preguntas actuales? Se perderá el estado de repeticiones.")) {
        console.log("Reiniciando progreso...");
        clearState();

        questionStats = {};
        questions.forEach((_, index) => {
            questionStats[index] = {
                repetitionsRemaining: configInitialRepetitions,
                lastAskedAt: null,
                lastErrorAt: null,
                avgTime: avgTimePerRep
            };
        });

        questionQueue = [];
        currentQuestionIndex = null;
        initialTotalRepetitions = 0;
        buildQuestionQueue();

        showNextQuestion();
        showStatusMessage("Progreso reiniciado.", "success");
    }
}
// --- Funciones del Modal de Configuración ---

function populateConfigModal() {
    if (configRepsOnErrorInput) configRepsOnErrorInput.value = configRepetitionsOnError;
    if (configInitialRepsInput) configInitialRepsInput.value = configInitialRepetitions;
    if (configThemeSelect) configThemeSelect.value = themeMode;
}

function openConfigModal() {
    populateConfigModal(); // Asegurar que los valores estén actualizados al abrir
    if (configModalOverlay) configModalOverlay.classList.remove('hidden');
}

function closeConfigModal() {
    if (configModalOverlay) configModalOverlay.classList.add('hidden');
}

function loadQuizConfig() {
    const savedConfigJSON = localStorage.getItem(QUIZ_CONFIG_KEY);
    if (savedConfigJSON) {
        try {
            const savedConfig = JSON.parse(savedConfigJSON);
            if (typeof savedConfig.repetitionsOnError === 'number') {
                configRepetitionsOnError = savedConfig.repetitionsOnError;
            }
            if (typeof savedConfig.initialRepetitions === 'number') {
                configInitialRepetitions = savedConfig.initialRepetitions;
            }
            if (savedConfig.themeMode === 'dark' || savedConfig.themeMode === 'light') {
                themeMode = savedConfig.themeMode;
            }
            console.log("Configuración cargada desde localStorage:", savedConfig);
        } catch (e) {
            console.error("Error al parsear configuración desde localStorage:", e);
        }
    }
    // Llenar el modal después de cargar, por si no se abre inmediatamente
    populateConfigModal();
}

function saveQuizConfig() {
    const currentConfig = {
        repetitionsOnError: configRepetitionsOnError,
        initialRepetitions: configInitialRepetitions,
        themeMode: themeMode
    };
    try {
        localStorage.setItem(QUIZ_CONFIG_KEY, JSON.stringify(currentConfig));
        console.log("Configuración guardada en localStorage:", currentConfig);
    } catch (e) {
        console.error("Error al guardar configuración en localStorage:", e);
    }
}

function handleSaveConfig() {
    const newRepsOnError = parseInt(configRepsOnErrorInput.value, 10);
    const newInitialReps = parseInt(configInitialRepsInput.value, 10);
    const newTheme = configThemeSelect.value;

    let configChanged = false;
    let initialRepsChanged = false;

    if (!isNaN(newRepsOnError) && newRepsOnError >= 0 && newRepsOnError !== configRepetitionsOnError) {
        configRepetitionsOnError = newRepsOnError;
        configChanged = true;
    }

    if (!isNaN(newInitialReps) && newInitialReps >= 1 && newInitialReps !== configInitialRepetitions) {
        initialRepsChanged = true;
        // No actualizamos configInitialRepetitions aquí todavía, esperamos confirmación si es necesario
    }

    if (newTheme !== themeMode) {
        themeMode = newTheme;
        applyTheme(themeMode);
        configChanged = true;
    }

    if (initialRepsChanged) {
        if (confirm(`Cambiar las repeticiones iniciales a ${newInitialReps} requiere reiniciar el progreso actual para todas las preguntas. ¿Deseas continuar y reiniciar?`)) {
            configInitialRepetitions = newInitialReps; // Ahora sí actualizamos
            configChanged = true; // Marcamos que hubo un cambio que guardar
            saveQuizConfig();
            resetCurrentProgress(); // resetCurrentProgress usará el nuevo configInitialRepetitions
            showStatusMessage("Configuración guardada y progreso reiniciado.", "success", 3000);
        } else {
            // El usuario canceló el reinicio, así que no cambiamos initialReps.
            // Pero sí guardamos si repsOnError cambió.
            if (configRepetitionsOnError !== (localStorage.getItem(QUIZ_CONFIG_KEY) ? JSON.parse(localStorage.getItem(QUIZ_CONFIG_KEY)).repetitionsOnError : 1)) {
                 saveQuizConfig(); // Guardar solo si repsOnError cambió y es diferente a lo guardado
                 showStatusMessage("Configuración de 'aumento por error' guardada. Las repeticiones iniciales no se modificaron.", "info", 4000);
            } else {
                showStatusMessage("No se realizaron cambios en la configuración.", "info", 3000);
            }
            // Revertir el input de repeticiones iniciales a su valor original
            configInitialRepsInput.value = configInitialRepetitions;
        }
    } else if (configChanged) { // Solo cambió repsOnError o no cambió nada relevante para reinicio
        saveQuizConfig();
        showStatusMessage("Configuración guardada.", "success", 3000);
    } else {
        showStatusMessage("No se detectaron cambios en la configuración.", "info", 3000);
    }

    closeConfigModal();
}

function applyTheme(mode) {
    if (mode !== 'dark' && mode !== 'light') return;
    themeMode = mode;
    document.body.classList.toggle('dark-mode', mode === 'dark');
}
