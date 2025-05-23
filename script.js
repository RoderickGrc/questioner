// script.js

// --- Configuración del Quiz (valores por defecto) ---
let configRepetitionsOnError = 1;
let configInitialRepetitions = 3;
const QUIZ_CONFIG_KEY = 'interactiveQuizConfig'; // Clave para localStorage

// Referencias a elementos del DOM para el modal de configuración
let configButton = null;
let configModalOverlay = null;
let configModal = null;
let configRepsOnErrorInput = null;
let configInitialRepsInput = null;
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
let quizContainerDiv = null; // <-- NUEVO: Referencia al contenedor principal

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos clave del DOM
    quizDiv = document.getElementById('quiz');
    statusMessageDiv = document.getElementById('status-message');
    fileInput = document.getElementById('file-input');
    csvFileInput = document.getElementById('csv-file-input');
    quizContainerDiv = document.querySelector('.quiz-container');

    // Referencias para el modal de configuración
    configButton = document.getElementById('config-button');
    configModalOverlay = document.getElementById('config-modal-overlay');
    configModal = document.getElementById('config-modal');
    configRepsOnErrorInput = document.getElementById('config-reps-on-error');
    configInitialRepsInput = document.getElementById('config-initial-reps');
    saveConfigButton = document.getElementById('save-config-button');
    closeModalButton = document.getElementById('close-config-modal-button');
    closeModalXButton = document.getElementById('close-modal-x');

    if (!quizDiv || !statusMessageDiv || !fileInput || !csvFileInput || !quizContainerDiv ||
        !configButton || !configModalOverlay || !configModal || !configRepsOnErrorInput ||
        !configInitialRepsInput || !saveConfigButton || !closeModalButton || !closeModalXButton) {
        console.error("Error: No se encontraron elementos esenciales del DOM (quiz, status, inputs, o elementos del modal).");
        if(quizDiv) quizDiv.innerHTML = "<p class='error-message'>Error crítico: Faltan elementos HTML esenciales para el quiz o la configuración.</p>";
        return;
    }

    loadQuizConfig(); // Cargar configuración guardada
    setupEventListeners(); // Configurar listeners de botones generales y del modal

    loadInitialCSV('questions.csv'); // Cargar el CSV inicial
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
            resetQuizState(); // Limpiar estado antes de parsear
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

        questions.push({
            pregunta: pregunta,
            correctAnswers: correctAnswers,
            incorrectAnswers: incorrectAnswers,
            explicacion: explicacion
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
            questionStats[idxStr] = { repetitionsRemaining: configInitialRepetitions, lastAskedAt: null };
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

    updateStats(questionIndex, isCorrect);
    showExplanationAndNext(questionIndex, isCorrect, [selectedOption]);
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

    updateStats(questionIndex, isCorrect);
    showExplanationAndNext(questionIndex, isCorrect, selectedOptions);
}

function handleSkipQuestion(questionIndex) {
    console.log(`Skipping question index: ${questionIndex}`);
    disableOptionsAndActions();

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
                selectionDiv.classList.add('correct-selection');
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
        questionQueue: queueToSave
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

function resetQuizState() {
    questions = [];
    questionStats = {};
    questionQueue = [];
    currentQuestionIndex = null;
    totalQuestions = 0;
    isMultiSelectMode = false;
    clearState();
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
        questionQueue: queueToSave
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
            questionStats[index] = { repetitionsRemaining: configInitialRepetitions, lastAskedAt: null };
        });

        questionQueue = [];
        currentQuestionIndex = null;
        buildQuestionQueue();

        showNextQuestion();
        showStatusMessage("Progreso reiniciado.", "success");
    }
}
// --- Funciones del Modal de Configuración ---

function populateConfigModal() {
    if (configRepsOnErrorInput) configRepsOnErrorInput.value = configRepetitionsOnError;
    if (configInitialRepsInput) configInitialRepsInput.value = configInitialRepetitions;
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
        initialRepetitions: configInitialRepetitions
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
