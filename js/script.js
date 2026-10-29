/**
 * Super roberto Jump - Lógica do Jogo e Integração com Ranking MySQL (Laragon)
 */
 
document.addEventListener('DOMContentLoaded', () => {
    let selectedCharacter = 'roberto'; // personagem padrão
    // Elementos do Jogo
    const roberto = document.querySelector('.roberto');
    const pipe = document.querySelector('.pipe');
    const gameBoard = document.getElementById('game-board');
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const jumpTip = document.getElementById('jump-tip');
    const coin = document.getElementById('coin');
    const coinsDisplay = document.getElementById('coins-display');
 
    // Modais e Telas
    const startModal = document.getElementById('start-modal');
    const startForm = document.getElementById('start-form');
    const playerInput = document.getElementById('player-input');
    const btnViewRanking = document.getElementById('btn-view-ranking');
 
    const gameoverModal = document.getElementById('gameover-modal');
    const finalScoreValue = document.getElementById('final-score-value');
    const saveStatusMsg = document.getElementById('save-status-msg');
    const rankingBody = document.getElementById('ranking-body');
    const btnRestart = document.getElementById('btn-restart');
    const btnChangePlayer = document.getElementById('btn-change-player');
 
    // Variáveis de Estado
    let currentPlayer = '';
    let score = 0;
    let isPlaying = false;
    let gameLoop = null;
    let scoreLoop = null;
    let velocidadeBase = 0;
    let dificuldadeAtual = 0;
 
    // Moedas
    const PONTOS_MOEDA = 10;          // pontos ganhos por moeda
    const ALTURAS_MOEDA = [30, 190];  // 30 = no chão | 190 = precisa pular
    let moedas = 0;
    let coinAtiva = false;
    let coinX = 0;
    let ultimoTempoMoeda = 0;
    let velocidadeMultiplicador = 1;
 
    // Lista de fundos, na ordem em que aparecem (a cada 200 pontos)
    const FUNDOS = [
        'assets/fundo.jpg',   // 0 - 199   (original)
        'assets/fundo2.jpg',  // 200 - 399
        'assets/fundo3.jpg',  // 400 - 599
        'assets/fundo4.jpg',  // 600 - 799
        'assets/fundo3.jpg',  // 800 - 999
        'assets/fundo2.jpg',  // 800 - 999
        'assets/fundo.jpg',  // 800 - 999
    ];
    const PONTOS_POR_FUNDO = 200;
    let fundoAtualIndex = 0;
 
    // Pré-carrega as imagens pra não piscar na hora de trocar
    FUNDOS.forEach(src => { const img = new Image(); img.src = src; });
 
    // Recupera último nome utilizado caso exista
    const savedName = localStorage.getItem('roberto_jump_player');
    if (savedName && playerInput) {
        playerInput.value = savedName;
    }
 
    // ===== Seleção de Personagem =====
    const characterCards = document.querySelectorAll('.character-card');
    characterCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove seleção anterior
            characterCards.forEach(c => c.classList.remove('selected'));
            // Marca o novo
            card.classList.add('selected');
            selectedCharacter = card.dataset.character;
            localStorage.setItem('roberto_jump_character', selectedCharacter);
        });
    });
 
    // Recupera o último personagem escolhido
    const savedCharacter = localStorage.getItem('roberto_jump_character');
    if (savedCharacter) {
        const savedCard = document.querySelector(`.character-card[data-character="${savedCharacter}"]`);
        if (savedCard) {
            characterCards.forEach(c => c.classList.remove('selected'));
            savedCard.classList.add('selected');
            selectedCharacter = savedCharacter;
        }
    }
 
    /**
     * Altera a imagem do fundo
     */
    function trocarFundo(caminhoImagem) {
        const imagensCenario = document.querySelectorAll('.scenario-track img');
        imagensCenario.forEach(img => {
            img.src = caminhoImagem;
        });
 
        if (gameBoard) {
            gameBoard.style.backgroundImage = `url('${caminhoImagem}')`;
        }
    }
 
    /**
     * Inicia uma nova rodada
     */
    function startGame() {
        // Limpa loops anteriores se existirem
        clearInterval(gameLoop);
        clearInterval(scoreLoop);
 
        // Reseta posições e visuais
        resetElements();
 
        isPlaying = true;
        score = 0;
        scoreDisplay.textContent = '0';
        hudPlayerName.textContent = currentPlayer || 'Jogador';
 
        // Ativa animações CSS do jogo
        gameBoard.classList.add('running');
        
        // Guarda a velocidade normal do cano
        velocidadeBase = parseFloat(
            window.getComputedStyle(pipe).animationDuration
        );
 
        // Começa sempre no nível normal
        dificuldadeAtual = 0;
        velocidadeMultiplicador = 1;
 
        // Zera as moedas
        moedas = 0;
        coinsDisplay.textContent = '0';
        desativarMoeda();
 
        // Loop de pontuação progressiva (1 ponto a cada 100ms)
        scoreLoop = setInterval(() => {
            if (isPlaying) {
                score += 1;
                scoreDisplay.textContent = score;
                atualizarDificuldade();
            }
        }, 100);
 
        // Loop de colisão
        gameLoop = setInterval(() => {
            checkCollision();
            atualizarMoeda();
        }, 10);
    }
 
    function atualizarDificuldade() {
        // Troca o fundo a cada 200 pontos (volta ao original no 1000)
        const novoIndice = Math.floor(score / PONTOS_POR_FUNDO) % FUNDOS.length;
 
        if (novoIndice !== fundoAtualIndex) {
            fundoAtualIndex = novoIndice;
            trocarFundo(FUNDOS[novoIndice]);
        }
 
        let novoNivel = 0;
        let multiplicador = 1;
 
        if (score >= 90) {
            novoNivel = 3;
            multiplicador = 1.8;
        } else if (score >= 60) {
            novoNivel = 2;
            multiplicador = 1.5;
        } else if (score >= 30) {
            novoNivel = 1;
            multiplicador = 1.25;
        }
 
        // Só muda a velocidade quando o nível muda
        if (novoNivel !== dificuldadeAtual) {
            dificuldadeAtual = novoNivel;
            velocidadeMultiplicador = multiplicador;
 
            const animacaoCano = pipe.getAnimations()[0];
 
            if (animacaoCano) {
                animacaoCano.playbackRate = multiplicador;
            }
        }
    }
 
    function desativarMoeda() {
        coinAtiva = false;
        coin.classList.remove('active');
    }
 
    function atualizarMoeda() {
        if (!isPlaying) return;
 
        const larguraBoard = gameBoard.clientWidth;
 
        // Nasce uma nova moeda quando o cano já passou da metade da tela
        if (!coinAtiva) {
            if (pipe.offsetLeft < larguraBoard * 0.35) {
                coinX = larguraBoard;
                coin.style.left = coinX + 'px';
                coin.style.bottom = ALTURAS_MOEDA[Math.floor(Math.random() * ALTURAS_MOEDA.length)] + 'px';
                coin.classList.add('active');
                coinAtiva = true;
                ultimoTempoMoeda = performance.now();
            }
            return;
        }
 
        // Move a moeda na mesma velocidade do cano
        const agora = performance.now();
        const dt = agora - ultimoTempoMoeda;
        ultimoTempoMoeda = agora;
 
        const pxPorMs = larguraBoard / (velocidadeBase * 1000);
        coinX -= pxPorMs * velocidadeMultiplicador * dt;
        coin.style.left = coinX + 'px';
 
        // Saiu da tela sem ser pega
        if (coinX < -60) {
            desativarMoeda();
            return;
        }
 
        // Colisão moeda x personagem
        const rc = coin.getBoundingClientRect();
        const rr = roberto.getBoundingClientRect();
        const margem = 25;
 
        if (
            rc.left < rr.right - margem &&
            rc.right > rr.left + margem &&
            rc.top < rr.bottom - margem &&
            rc.bottom > rr.top + margem
        ) {
            moedas += 1;
            score += PONTOS_MOEDA;
            coinsDisplay.textContent = moedas;
            scoreDisplay.textContent = score;
            desativarMoeda();
        }
    }
 
    function resetElements() {
        desativarMoeda();
 
        // Reseta o fundo para o inicial
        fundoAtualIndex = 0;
        trocarFundo(FUNDOS[0]);
 
        // Reseta cano
        pipe.style.animation = '';
        pipe.style.left = '';
        pipe.style.animationDuration = '';
 
        // Reseta roberto
        roberto.src = `assets/${selectedCharacter}.gif`;        
        roberto.style.animation = '';
        roberto.style.bottom = '0px';
        roberto.style.width = '';
        roberto.style.marginLeft = '';
        roberto.classList.remove('jump');
 
        if (jumpTip) {
            jumpTip.style.opacity = '1';
        }
    }
 
    function jump() {
        if (!isPlaying) return;
        if (roberto.classList.contains('jump')) return;
 
        roberto.classList.add('jump');
 
        if (jumpTip) {
            jumpTip.style.opacity = '0';
        }
 
        setTimeout(() => {
            roberto.classList.remove('jump');
        }, 500);
    }
 
    function checkCollision() {
        if (!isPlaying) return;
 
        const pipePosition = pipe.offsetLeft;
        const robertoPosition = +window.getComputedStyle(roberto).bottom.replace('px', '');
 
        // Tolerância de colisão
        if (pipePosition <= 120 && pipePosition > 0 && robertoPosition < 80) {
            triggerGameOver(pipePosition, robertoPosition);
        }
    }
 
    function triggerGameOver(fundoPosition, robertoPosition) {
        isPlaying = false;
        clearInterval(gameLoop);
        clearInterval(scoreLoop);
 
        gameBoard.classList.remove('running');
        desativarMoeda();
 
        roberto.style.animation = 'none';
        roberto.style.bottom = `${robertoPosition}px`;
        roberto.src = `assets/${selectedCharacter}-game-over.png`;
        roberto.style.marginLeft = '50px';
 
        finalScoreValue.textContent = score;
        saveStatusMsg.textContent = 'Salvando pontuação no banco...';
        saveStatusMsg.style.color = '#ffcc00';
 
        gameoverModal.classList.add('active');
 
        saveScore(currentPlayer, score);
    }
 
    function saveScore(playerName, finalScore) {
        fetch('salvar_ranking.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: playerName,
                pontos: finalScore
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    saveStatusMsg.textContent = 'Pontuação registrada no banco!';
                    saveStatusMsg.style.color = '#10b981';
                    if (data.ranking) {
                        renderRanking(data.ranking, playerName, finalScore);
                    }
                } else {
                    saveStatusMsg.textContent = '⚠️ ' + (data.message || 'Erro ao registrar.');
                    saveStatusMsg.style.color = '#ef4444';
                }
            })
            .catch(err => {
                console.error('Erro na requisição:', err);
                saveStatusMsg.textContent = '⚠️ Erro ao conectar ao servidor Laragon.';
                saveStatusMsg.style.color = '#ef4444';
            });
    }
 
    function fetchRanking() {
        fetch('obter_ranking.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.ranking) {
                    renderRanking(data.ranking);
                }
            })
            .catch(err => console.error('Erro ao buscar ranking:', err));
    }
 
    function renderRanking(list, highlightName = null, highlightScore = null) {
        if (!rankingBody) return;
        rankingBody.innerHTML = '';
 
        if (!list || list.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Nenhuma pontuação gravada ainda. Jogue para ser o 1º!</td></tr>';
            return;
        }
 
        let highlighted = false;
 
        list.forEach((item, index) => {
            const tr = document.createElement('tr');
 
            if (!highlighted && highlightName && item.nome === highlightName && parseInt(item.pontos, 10) === highlightScore) {
                tr.classList.add('highlight-current');
                highlighted = true;
            }
 
            let medal = `${index + 1}º`;
            if (index === 0) medal = '🥇 1º';
            else if (index === 1) medal = '🥈 2º';
            else if (index === 2) medal = '🥉 3º';
 
            tr.innerHTML = `
                <td class="ranking-pos">${medal}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${parseInt(item.pontos, 10)} pts</td>
            `;
 
            rankingBody.appendChild(tr);
        });
    }
 
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
 
    // Submit do Formulário de Início
    startForm.addEventListener('submit', (e) => {
        e.preventDefault();
 
        const nameValue = playerInput.value.trim();
        if (!nameValue) {
            playerInput.focus();
            return;
        }
 
        currentPlayer = nameValue;
        localStorage.setItem('roberto_jump_player', currentPlayer);
 
        startModal.classList.remove('active');
        startGame();
    });
 
    // Botão "VER RANKING" na tela inicial
    btnViewRanking.addEventListener('click', () => {
        fetchRanking();
        finalScoreValue.textContent = '---';
        saveStatusMsg.textContent = '';
        startModal.classList.remove('active');
        gameoverModal.classList.add('active');
    });
 
    // Botão "JOGAR NOVAMENTE" no Game Over
    btnRestart.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        if (!currentPlayer) {
            startModal.classList.add('active');
            playerInput.focus();
        } else {
            startGame();
        }
    });
 
    // Botão "TROCAR JOGADOR" no Game Over
    btnChangePlayer.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        resetElements();
        startModal.classList.add('active');
        playerInput.value = '';
        playerInput.focus();
    });
 
    // Controle do Pulo por Teclado
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });
});
