document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // 1. CONSTANTES Y ESTADO DEL JUEGO
    // ==========================================================================
    const STORAGE_KEY = 'palabraSecretaGameState';
    const wordList = [ /* ... (la misma lista de 50 palabras) ... */ ];
    let gameState = { players: [], gameConfig: { time: 90 }, currentWordPair: null, impostorIndex: -1, currentPlayerRevealIndex: 0, currentScreen: 'config', debateTimeLeft: 90, votes: {} };
    let debateTimerInterval;

    // ==========================================================================
    // 2. SELECTORES DEL DOM (con modal)
    // ==========================================================================
    const screens = { config: document.getElementById('config-screen'), reveal: document.getElementById('reveal-screen'), countdown: document.getElementById('countdown-screen'), debate: document.getElementById('debate-screen'), end: document.getElementById('end-screen') };
    const playerCountSelect = document.getElementById('player-count');
    const roundTimeInput = document.getElementById('round-time');
    const playerInputsContainer = document.getElementById('player-inputs-container');
    const startGameBtn = document.getElementById('start-game-btn');
    const playerTurnTitle = document.getElementById('player-turn-title');
    const pinVerificationDiv = document.getElementById('pin-verification');
    const pinInput = document.getElementById('pin-input');
    const verifyPinBtn = document.getElementById('verify-pin-btn');
    const roleCardArea = document.getElementById('role-card-area');
    const revealCardContainer = document.getElementById('reveal-card-container');
    const playerRoleEl = document.getElementById('player-role');
    const wordClueLabelEl = document.getElementById('word-clue-label');
    const playerWordEl = document.getElementById('player-word');
    const nextPlayerBtn = document.getElementById('next-player-btn');
    const countdownNumberEl = document.getElementById('countdown-number');
    const starterAnnouncementEl = document.getElementById('starter-announcement');
    const timerDisplay = document.getElementById('timer-display');
    const votingArea = document.getElementById('voting-area');
    const endVoteBtn = document.getElementById('end-vote-btn');
    const gameResultTitle = document.getElementById('game-result-title');
    const winnerAnnouncement = document.getElementById('winner-announcement');
    const impostorReveal = document.getElementById('impostor-reveal');
    const wordReveal = document.getElementById('word-reveal');
    const clueReveal = document.getElementById('clue-reveal');
    const playAgainBtn = document.getElementById('play-again-btn');
    // Selectores del Modal
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const modalInput = document.getElementById('modal-input');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    // ==========================================================================
    // 3. LÓGICA DEL MODAL PERSONALIZADO
    // ==========================================================================
    function showCustomPrompt({ title, text, inputType = 'text', confirmText = 'Confirmar', showInput = true, showCancel = true }) {
        return new Promise((resolve) => {
            modalTitle.textContent = title;
            modalText.textContent = text;
            modalInput.type = inputType;
            modalInput.value = '';
            modalInput.style.display = showInput ? 'block' : 'none';
            modalCancelBtn.style.display = showCancel ? 'block' : 'none';
            modalConfirmBtn.textContent = confirmText;

            modal.classList.remove('hidden');
            if (showInput) modalInput.focus();

            const handleConfirm = () => { cleanup(); resolve(modalInput.value); };
            const handleCancel = () => { cleanup(); resolve(null); };
            
            const cleanup = () => {
                modal.classList.add('hidden');
                modalConfirmBtn.removeEventListener('click', handleConfirm);
                modalCancelBtn.removeEventListener('click', handleCancel);
            };

            modalConfirmBtn.addEventListener('click', handleConfirm);
            modalCancelBtn.addEventListener('click', handleCancel);
        });
    }

    // ==========================================================================
    // 4. LÓGICA DE PERSISTENCIA Y FUNCIONES PRINCIPALES
    // ==========================================================================
    function saveGameState() { /* ... (sin cambios) ... */ }
    function loadGameState() { /* ... (sin cambios) ... */ }
    function clearGameState() { /* ... (sin cambios) ... */ }
    function rehydrateGame() { /* ... (sin cambios) ... */ }
    function showScreen(screenId) { /* ... (sin cambios) ... */ }
    function generatePlayerInputs(count) { /* ... (sin cambios) ... */ }
    function setupGame() { /* ... (sin cambios) ... */ }
    function setupRevealScreen() { /* ... (sin cambios) ... */ }
    function startCountdown() { /* ... (sin cambios) ... */ }
    function startDebate(startTime) { /* ... (sin cambios) ... */ }
    function renderVotingButtons() { /* ... (sin cambios) ... */ }

    /**
     * Maneja el clic en un botón de votación usando el modal personalizado (ASÍNCRONO).
     */
    async function handleVoteClick(e) {
        const targetName = e.currentTarget.dataset.playerName;

        const voterName = await showCustomPrompt({
            title: 'Registrar Voto',
            text: `¿Quién está votando por ${targetName}? Ingresa tu nombre.`,
            inputType: 'text'
        });
        if (voterName === null) return; // El usuario canceló

        const voter = gameState.players.find(p => p.name.toLowerCase() === voterName.trim().toLowerCase());
        if (!voter) {
            await showCustomPrompt({ title: 'Error', text: 'Nombre de votante no encontrado.', showInput: false, showCancel: false, confirmText: 'Entendido' });
            return;
        }

        const voterPin = await showCustomPrompt({
            title: 'Verificación de PIN',
            text: `Hola ${voter.name}, ingresa tu PIN de 4 dígitos para confirmar tu voto.`,
            inputType: 'password'
        });
        if (voterPin === null) return; // El usuario canceló

        if (voterPin === voter.pin) {
            gameState.votes[targetName]++;
            await showCustomPrompt({ title: 'Voto Registrado', text: `¡Gracias! Tu voto para ${targetName} ha sido contado.`, showInput: false, showCancel: false, confirmText: 'OK' });
            renderVotingButtons();
            saveGameState();
        } else {
            await showCustomPrompt({ title: 'Error', text: 'PIN incorrecto. El voto no fue registrado.', showInput: false, showCancel: false, confirmText: 'Cerrar' });
        }
    }

    function tallyVotes() { /* ... (sin cambios, excepto el alert) ... */ 
        let maxVotes = -1, mostVotedPlayerName = '', tie = false;
        for (const playerName in gameState.votes) {
            if (gameState.votes[playerName] > maxVotes) {
                maxVotes = gameState.votes[playerName];
                mostVotedPlayerName = playerName;
                tie = false;
            } else if (gameState.votes[playerName] === maxVotes && maxVotes > 0) {
                tie = true;
            }
        }
        if (tie || maxVotes <= 0) {
            showCustomPrompt({ title: 'Empate', text: 'Hubo un empate o no hubo votos válidos. ¡El impostor se escapa!', showInput: false, showCancel: false, confirmText: 'Continuar' })
                .then(() => endGame(null));
        } else {
            endGame(mostVotedPlayerName);
        }
    }

    function endGame(votedOutPlayerName, rehydrating = false) { /* ... (sin cambios) ... */ }

    // ==========================================================================
    // 5. EVENT LISTENERS (con `alert` y `confirm` reemplazados)
    // ==========================================================================
    
    startGameBtn.addEventListener('click', async () => {
        clearGameState();
        const nameInputs = document.querySelectorAll('.player-name');
        const pinInputs = document.querySelectorAll('.player-pin');
        gameState.players = [];
        let allValid = true;

        for (let i = 0; i < nameInputs.length; i++) {
            const name = nameInputs[i].value.trim();
            const pin = pinInputs[i].value;
            if (name === '' || !/^\d{4}$/.test(pin)) {
                allValid = false;
                await showCustomPrompt({ title: 'Error de Configuración', text: 'Todos los jugadores deben tener un nombre y un PIN de 4 dígitos.', showInput: false, showCancel: false, confirmText: 'Entendido' });
                break;
            }
            gameState.players.push({ name, pin, role: '', word: '' });
        }

        if (allValid) {
            gameState.gameConfig.time = parseInt(roundTimeInput.value, 10);
            setupGame();
        }
    });

    verifyPinBtn.addEventListener('click', async () => {
        const currentPlayer = gameState.players[gameState.currentPlayerRevealIndex];
        if (pinInput.value === currentPlayer.pin) {
            pinVerificationDiv.style.display = 'none';
            roleCardArea.classList.remove('hidden');
        } else {
            await showCustomPrompt({ title: 'Error', text: 'PIN incorrecto. Inténtalo de nuevo.', showInput: false, showCancel: false, confirmText: 'Cerrar' });
            pinInput.value = '';
        }
    });

    endVoteBtn.addEventListener('click', async () => {
        const confirmed = await showCustomPrompt({
            title: 'Finalizar Votación',
            text: '¿Están seguros de que quieren finalizar la votación ahora?',
            showInput: false
        });
        if (confirmed !== null) { // Si no se canceló
            clearInterval(debateTimerInterval);
            tallyVotes();
        }
    });

    // ... (El resto de los listeners y funciones sin cambios significativos)
    // Copiando el resto de funciones y listeners para asegurar que esté completo
    const fullWordList = [
        { word: "Hospital", clue: "Salud" }, { word: "Playa", clue: "Verano" },
        { word: "Biblioteca", clue: "Libros" }, { word: "Supermercado", clue: "Comida" },
        { word: "Concierto", clue: "Música" }, { word: "Gimnasio", clue: "Ejercicio" },
        { word: "Restaurante", clue: "Cenar" }, { word: "Aeropuerto", clue: "Viaje" },
        { word: "Cine", clue: "Película" }, { word: "Parque", clue: "Naturaleza" },
        { word: "Escuela", clue: "Estudiar" }, { word: "Museo", clue: "Arte" },
        { word: "Zoológico", clue: "Animales" }, { word: "Estadio", clue: "Deporte" },
        { word: "Cocina", clue: "Recetas" }, { word: "Garaje", clue: "Coche" },
        { word: "Jardín", clue: "Plantas" }, { word: "Oficina", clue: "Trabajo" },
        { word: "Montaña", clue: "Escalar" }, { word: "Río", clue: "Agua" },
        { word: "Desierto", clue: "Arena" }, { word: "Bosque", clue: "Árboles" },
        { word: "Iglesia", clue: "Religión" }, { word: "Banco", clue: "Dinero" },
        { word: "Farmacia", clue: "Medicina" }, { word: "Teatro", clue: "Actuación" },
        { word: "Piscina", clue: "Nadar" }, { word: "Panadería", clue: "Pan" },
        { word: "Carnaval", clue: "Fiesta" }, { word: "Boda", clue: "Matrimonio" },
        { word: "Cumpleaños", clue: "Regalo" }, { word: "Navidad", clue: "Invierno" },
        { word: "Policía", clue: "Ley" }, { word: "Bomberos", clue: "Fuego" },
        { word: "Laboratorio", clue: "Ciencia" }, { word: "Universidad", clue: "Carrera" },
        { word: "Hotel", clue: "Alojamiento" }, { word: "Taller", clue: "Reparar" },
        { word: "Espacio", clue: "Astronauta" }, { word: "Océano", clue: "Profundo" },
        { word: "Volcán", clue: "Lava" }, { word: "Selva", clue: "Exótico" },
        { word: "Fábrica", clue: "Producción" }, { word: "Castillo", clue: "Rey" },
        { word: "Pirámide", clue: "Egipto" }, { word: "Circo", clue: "Payaso" },
        { word: "Granja", clue: "Cultivo" }, { word: "Cárcel", clue: "Prisionero" },
        { word: "Barco", clue: "Navegar" }, { word: "Avión", clue: "Volar" }
    ];
    Object.assign(wordList, fullWordList); // Asegurarse de que la lista de palabras esté completa
    
    saveGameState = function() { gameState.debateTimeLeft = parseInt(timerDisplay.textContent) || gameState.gameConfig.time; localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); };
    loadGameState = function() { const savedState = localStorage.getItem(STORAGE_KEY); if (savedState) { gameState = JSON.parse(savedState); rehydrateGame(); } else { generatePlayerInputs(playerCountSelect.value); } };
    clearGameState = function() { localStorage.removeItem(STORAGE_KEY); };
    rehydrateGame = function() { playerCountSelect.value = gameState.players.length || 3; roundTimeInput.value = gameState.gameConfig.time; generatePlayerInputs(gameState.players.length || 3); const nameInputs = document.querySelectorAll('.player-name'); const pinInputs = document.querySelectorAll('.player-pin'); gameState.players.forEach((player, i) => { if(nameInputs[i]) nameInputs[i].value = player.name; if(pinInputs[i]) pinInputs[i].value = player.pin; }); showScreen(gameState.currentScreen); switch (gameState.currentScreen) { case 'reveal': setupRevealScreen(); break; case 'debate': renderVotingButtons(); startDebate(gameState.debateTimeLeft); break; case 'end': endGame(null, true); break; } };
    showScreen = function(screenId) { Object.values(screens).forEach(screen => screen.classList.remove('active')); screens[screenId].classList.add('active'); gameState.currentScreen = screenId; };
    generatePlayerInputs = function(count) { playerInputsContainer.innerHTML = ''; for (let i = 1; i <= count; i++) { const group = document.createElement('div'); group.className = 'player-input-group'; group.innerHTML = `<input type="text" placeholder="Nombre Jugador ${i}" class="neu-input player-name" required><input type="password" placeholder="PIN" class="neu-input player-pin" maxlength="4" inputmode="numeric" required pattern="[0-9]{4}">`; playerInputsContainer.appendChild(group); } };
    setupGame = function() { gameState.currentWordPair = wordList[Math.floor(Math.random() * wordList.length)]; gameState.impostorIndex = Math.floor(Math.random() * gameState.players.length); gameState.votes = {}; gameState.players.forEach((player, index) => { if (index === gameState.impostorIndex) { player.role = 'Impostor'; player.word = gameState.currentWordPair.clue; } else { player.role = 'Civil'; player.word = gameState.currentWordPair.word; } gameState.votes[player.name] = 0; }); gameState.currentPlayerRevealIndex = 0; setupRevealScreen(); showScreen('reveal'); saveGameState(); };
    setupRevealScreen = function() { const currentPlayer = gameState.players[gameState.currentPlayerRevealIndex]; if (!currentPlayer) return; playerTurnTitle.textContent = `Turno de ${currentPlayer.name}`; pinVerificationDiv.style.display = 'block'; roleCardArea.classList.add('hidden'); pinInput.value = ''; revealCardContainer.classList.remove('revealed'); nextPlayerBtn.classList.add('hidden'); playerRoleEl.textContent = currentPlayer.role; playerRoleEl.className = `role ${currentPlayer.role.toLowerCase()}`; playerWordEl.textContent = `"${currentPlayer.word}"`; wordClueLabelEl.textContent = currentPlayer.role === 'Impostor' ? 'Tu PISTA es:' : 'La Palabra Secreta es:'; };
    startCountdown = function() { showScreen('countdown'); const startingPlayer = gameState.players[Math.floor(Math.random() * gameState.players.length)]; starterAnnouncementEl.innerHTML = `Empieza la ronda:<br><span style="color: var(--accent-color);">${startingPlayer.name}</span>`; let count = 3; countdownNumberEl.textContent = count; const countdownInterval = setInterval(() => { count--; if (count > 0) { countdownNumberEl.textContent = count; } else { clearInterval(countdownInterval); startDebate(); } }, 1000); };
    startDebate = function(startTime) { showScreen('debate'); renderVotingButtons(); let timeLeft = startTime || gameState.gameConfig.time; timerDisplay.textContent = timeLeft; if (debateTimerInterval) clearInterval(debateTimerInterval); debateTimerInterval = setInterval(() => { timeLeft--; timerDisplay.textContent = timeLeft; if (timeLeft <= 0) { clearInterval(debateTimerInterval); timerDisplay.textContent = "0"; tallyVotes(); } saveGameState(); }, 1000); };
    renderVotingButtons = function() { votingArea.innerHTML = ''; gameState.players.forEach(player => { const button = document.createElement('button'); button.className = 'vote-button'; button.textContent = player.name; button.dataset.playerName = player.name; const voteCount = document.createElement('span'); voteCount.className = 'vote-count'; voteCount.textContent = gameState.votes[player.name] || 0; button.appendChild(voteCount); button.addEventListener('click', handleVoteClick); votingArea.appendChild(button); }); };
    endGame = function(votedOutPlayerName, rehydrating = false) { if (!rehydrating) { clearInterval(debateTimerInterval); } const impostor = gameState.players[gameState.impostorIndex]; if (!impostor) { clearGameState(); window.location.reload(); return; } let civiliansWin = votedOutPlayerName === impostor.name; gameResultTitle.textContent = civiliansWin ? "¡VICTORIA CIVIL!" : "¡EL IMPOSTOR GANA!"; winnerAnnouncement.textContent = civiliansWin ? `¡Felicidades! Han descubierto al Impostor.` : `El Impostor ha logrado engañarlos.`; impostorReveal.textContent = impostor.name; wordReveal.textContent = gameState.currentWordPair.word; clueReveal.textContent = gameState.currentWordPair.clue; showScreen('end'); if (!rehydrating) saveGameState(); };
    
    playerCountSelect.addEventListener('change', (e) => generatePlayerInputs(e.target.value));
    revealCardContainer.addEventListener('click', () => { if (revealCardContainer.classList.contains('revealed')) return; revealCardContainer.classList.add('revealed'); setTimeout(() => { nextPlayerBtn.classList.remove('hidden'); }, 700); });
    nextPlayerBtn.addEventListener('click', () => { gameState.currentPlayerRevealIndex++; saveGameState(); if (gameState.currentPlayerRevealIndex < gameState.players.length) { if (gameState.currentPlayerRevealIndex === gameState.players.length - 1) { nextPlayerBtn.textContent = "¡A JUGAR!"; } setupRevealScreen(); } else { startCountdown(); } });
    playAgainBtn.addEventListener('click', () => { clearGameState(); window.location.reload(); });

    // --- INICIALIZACIÓN ---
    loadGameState();
});
