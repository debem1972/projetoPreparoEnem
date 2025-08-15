// Função para buscar o JSON da URL raw
async function fetchRemoteJSON() {
    const JSON_URL = 'https://raw.githubusercontent.com/debem1972/projetoPreparoEnem/main/plano_de_estudos_2025-06-10.json';
    try {
        const response = await fetch(JSON_URL, { cache: 'no-store' }); // Evita cache para garantir a versão mais recente
        if (!response.ok) {
            throw new Error(`Erro ao carregar o JSON: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao buscar JSON remoto:', error.message);
        showToast('Não foi possível carregar o plano de estudos remoto. Usando dados locais.');
        return null;
    }
}
//--------------------------------------------------------------------

let dbInstance = null;

// Função para inicializar o IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open('PlanoDeEstudosDB', 2);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('planos')) {
                db.createObjectStore('planos', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('desempenho')) {
                db.createObjectStore('desempenho', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('postits')) {
                db.createObjectStore('postits', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('conteudos')) {
                db.createObjectStore('conteudos', { keyPath: 'key' });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            const error = event.target.error || new Error('Erro desconhecido ao abrir o IndexedDB');
            console.error('Erro ao abrir o IndexedDB:', error);
            reject(error);
        };

        request.onblocked = () => {
            reject(new Error('Abertura do IndexedDB bloqueada. Feche outras instâncias do aplicativo.'));
        };
    });
}

// Função para adicionar um plano
async function addPlano(data) {
    try {
        const db = await initDB();
        const transaction = db.transaction(['planos'], 'readwrite');
        const store = transaction.objectStore('planos');
        await store.add(data);
        console.log('Plano adicionado com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar plano:', error.message);
        throw error;
    }
}

// Função para registrar desempenho
async function addDesempenho(data) {
    try {
        const db = await initDB();
        const transaction = db.transaction(['desempenho'], 'readwrite');
        const store = transaction.objectStore('desempenho');
        await store.add(data);
        console.log('Desempenho registrado com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar desempenho:', error.message);
        throw error;
    }
}

// Função para adicionar post-it
async function addPostIt(data) {
    try {
        const db = await initDB();
        const transaction = db.transaction(['postits'], 'readwrite');
        const store = transaction.objectStore('postits');
        await store.add(data);
        console.log('Post-it adicionado com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar post-it:', error.message);
        throw error;
    }
}

// Função para carregar post-its
async function loadPostIts(dayKey) {
    try {
        const db = await initDB();
        const transaction = db.transaction(['postits'], 'readonly');
        const store = transaction.objectStore('postits');
        const request = store.getAll();
        return new Promise((resolve) => {
            request.onsuccess = () => {
                const postits = request.result.filter(postit => postit.dayKey === dayKey);
                console.log(`Carregando post-its para dayKey: ${dayKey}`, postits);
                postits.forEach(postit => createPostItElement(postit));
                resolve();
            };
            request.onerror = () => {
                console.error('Erro ao carregar post-its:', request.error);
                showToast('Erro ao carregar post-its.');
                resolve();
            };
        });
    } catch (error) {
        console.error('Erro ao carregar post-its:', error.message);
        showToast('Erro ao carregar post-its.');
    }
}
//-----------------------------------------------------------------------------------

// Função para remover post-it
async function removePostIt(id) {
    try {
        const db = await initDB();
        const transaction = db.transaction(['postits'], 'readwrite');
        const store = transaction.objectStore('postits');
        await store.delete(id);
        console.log('Post-it removido com sucesso!');
    } catch (error) {
        console.error('Erro ao remover post-it:', error.message);
    }
}

// Função para carregar dados de desempenho
async function loadPerformanceData() {
    try {
        const db = await initDB();
        const transaction = db.transaction(['desempenho'], 'readonly');
        const store = transaction.objectStore('desempenho');
        const request = store.getAll();
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Erro ao carregar dados de desempenho'));
        });
    } catch (error) {
        console.error('Erro ao carregar desempenho:', error.message);
        return [];
    }
}

// Conteúdo para 02/06/2025
// Função para carregar conteúdos do IndexedDB
async function loadContentData() {
    try {
        const db = await initDB();
        const transaction = db.transaction(['conteudos'], 'readonly');
        const store = transaction.objectStore('conteudos');
        const request = store.getAll();
        return new Promise((resolve) => {
            request.onsuccess = () => {
                const contents = {};
                request.result.forEach(item => {
                    contents[item.key] = item;
                });
                resolve(contents);
            };
            request.onerror = () => {
                console.error('Erro ao carregar conteúdos:', request.error);
                resolve({});
            };
        });
    } catch (error) {
        console.error('Erro ao carregar conteúdos:', error);
        return {};
    }
}

// Função para carregar matérias no subjectFilter
async function loadMaterias() {
    const materias = JSON.parse(localStorage.getItem('materias') || '[]');
    const subjectFilter = document.getElementById('subjectFilter');
    subjectFilter.innerHTML = '<option value="">Todas</option>';
    materias.forEach(materia => {
        const option = document.createElement('option');
        option.value = materia;
        option.textContent = materia;
        subjectFilter.appendChild(option);
    });
}

// Variáveis do cronômetro
let studyTimer = null;
let studySeconds = 0;
let performanceTimer = null;
let performanceStart = null;
let isRunning = false;
const totalStudyTime = 120 * 60;
const stages = [
    { time: 30 * 60, message: "Fim da Teoria Concentrada - Início Exercícios Práticos!" },
    { time: 75 * 60, message: "Fim dos Exercícios Práticos - Início Intervalo!" },
    { time: 90 * 60, message: "Fim do Intervalo - Início Resolução Comentada!" },
    { time: 120 * 60, message: "Fim da Resolução Comentada - Aula Concluída!" }
];
//--------------------------------------------------------------------------
// Função para carregar tempo acumulado de uma aula específica
async function loadAccumulatedTime(dayKey) {
    try {
        const db = await initDB();
        const transaction = db.transaction(['desempenho'], 'readonly');
        const store = transaction.objectStore('desempenho');
        const request = store.getAll();

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const records = request.result.filter(record => {
                    const recordKey = `${record.mes}-${record.semana}-${record.dia}`;
                    return recordKey === dayKey;
                });

                const totalTime = records.reduce((sum, record) => sum + (record.tempoTotal || 0), 0);
                resolve(totalTime);
            };
            request.onerror = () => {
                console.error('Erro ao carregar tempo acumulado:', request.error);
                resolve(0);
            };
        });
    } catch (error) {
        console.error('Erro ao carregar tempo acumulado:', error);
        return 0;
    }
}

// Função para atualizar barra de progresso com tempo acumulado
async function updateProgressBar() {
    const savedState = localStorage.getItem('planState');
    if (savedState) {
        const { month, week, day } = JSON.parse(savedState);
        const dayKey = `${month}-${week}-${day}`;
        const accumulatedTime = await loadAccumulatedTime(dayKey);
        const totalTimeWithCurrent = accumulatedTime + studySeconds;

        const progress = Math.min((totalTimeWithCurrent / totalStudyTime) * 100, 100);
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressBar').setAttribute('aria-valuenow', progress);
    }
}


// Função para formatar tempo
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Função para formatar tempo em minutos
function formatTimeMinutes(seconds) {
    return Math.floor(seconds / 60);
}

// Função para mostrar toast
function showToast(message) {
    const toastElement = document.getElementById('transitionToast');
    toastElement.querySelector('.toast-body').textContent = message;
    const toast = new bootstrap.Toast(toastElement, { delay: 6000 });
    toast.show();
}

// Função para atualizar cronômetro
// Função para atualizar cronômetro
async function updateTimer() {
    if (isRunning) {
        studySeconds++;
        document.getElementById('timerDisplay').textContent = formatTime(studySeconds);

        // Atualizar barra de progresso com tempo acumulado
        await updateProgressBar();

        // Verificar mensagens de transição (baseado apenas no tempo da sessão atual)
        for (const stage of stages) {
            if (studySeconds === stage.time) {
                showToast(stage.message);
            }
        }
    }
}

// Função para iniciar/parar cronômetro
function toggleTimer() {
    const button = document.getElementById('timerButton');
    if (!isRunning) {
        if (!performanceStart) {
            performanceStart = Date.now();
            performanceTimer = setInterval(() => { }, 1000);
        }
        isRunning = true;
        studyTimer = setInterval(updateTimer, 1000);
        button.innerHTML = '<i class="bi bi-pause-fill"></i> Pausar';
    } else {
        isRunning = false;
        clearInterval(studyTimer);
        button.innerHTML = '<i class="bi bi-play-fill"></i> Iniciar';
    }
}

// Função para salvar desempenho
// Função para salvar desempenho
async function savePerformance(month, week, day, materia, startTime) {
    try {
        const endTime = Date.now();
        const totalTime = Math.floor((endTime - startTime) / 1000);
        const dayKey = `${month}-${week}-${day}`;

        const data = {
            data: new Date().toISOString().split('T')[0],
            mes: month,
            semana: week,
            dia: day,
            dayKey: dayKey, // Adicionar chave do dia
            materia: materia,
            tempoTotal: totalTime
        };
        await addDesempenho(data);

        // Atualizar barra de progresso após salvar
        await updateProgressBar();
    } catch (error) {
        console.error('Erro ao salvar desempenho:', error.message);
    }
}

// Função para criar post-it
// Função para criar post-it
function createPostItElement(postit) {
    const postitElement = document.createElement('div');
    postitElement.className = `postit postit-${postit.color}`;
    postitElement.dataset.id = postit.id;
    postitElement.style.left = `${postit.x}px`;
    postitElement.style.top = `${postit.y}px`;
    postitElement.style.width = `${postit.width || 200}px`;
    postitElement.style.height = `${postit.height || 200}px`;

    // Adicionar label com a matéria
    const materiaLabel = document.createElement('div');
    materiaLabel.className = 'materia-label';
    materiaLabel.textContent = postit.materia || 'Desconhecida';
    materiaLabel.style.fontSize = '12px';
    materiaLabel.style.padding = '2px 5px';
    materiaLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    materiaLabel.style.position = 'absolute';
    materiaLabel.style.top = '5px';
    materiaLabel.style.left = '5px';

    const textarea = document.createElement('textarea');
    textarea.value = postit.content || postit.text || '';
    textarea.addEventListener('input', () => {
        updatePostIt(postit.id, { content: textarea.value });
    });

    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => {
        postitElement.remove();
        removePostIt(postit.id);
    });

    postitElement.appendChild(materiaLabel);
    postitElement.appendChild(textarea);
    postitElement.appendChild(deleteBtn);
    document.getElementById('contentArea').appendChild(postitElement);

    interact(postitElement)
        .draggable({
            onmove: (event) => {
                const x = (parseFloat(postit.x) || 0) + event.dx;
                const y = (parseFloat(postit.y) || 0) + event.dy;
                postitElement.style.left = `${x}px`;
                postitElement.style.top = `${y}px`;
                postit.x = x;
                postit.y = y;
                updatePostIt(postit.id, { x, y });
            }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                move(event) {
                    let { x, y } = postit;
                    x = (parseFloat(x) || 0) + event.deltaRect.left;
                    y = (parseFloat(y) || 0) + event.deltaRect.top;

                    Object.assign(postitElement.style, {
                        width: `${event.rect.width}px`,
                        height: `${event.rect.height}px`,
                        left: `${x}px`,
                        top: `${y}px`
                    });

                    postit.x = x;
                    postit.y = y;
                    postit.width = event.rect.width;
                    postit.height = event.rect.height;
                    updatePostIt(postit.id, { x, y, width: event.rect.width, height: event.rect.height });
                }
            },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 100, height: 100 },
                    max: { width: 300, height: 300 }
                })
            ]
        });
}
//-------------------------------------------------------------------------------

// Função para atualizar post-it
async function updatePostIt(id, updates) {
    try {
        const db = await initDB();
        const transaction = db.transaction(['postits'], 'readwrite');
        const store = transaction.objectStore('postits');
        const request = store.get(id);
        request.onsuccess = () => {
            const postit = request.result;
            Object.assign(postit, updates);
            store.put(postit);
        };
        request.onerror = () => {
            console.error('Erro ao buscar post-it:', request.error);
        };
    } catch (error) {
        console.error('Erro ao atualizar post-it:', error.message);
    }
}

// Função para atualizar gráfico
async function updateChart() {
    const month = document.getElementById('monthFilter').value;
    const week = document.getElementById('weekFilter').value;
    const day = document.getElementById('dayFilter').value;
    const subject = document.getElementById('subjectFilter').value;

    const data = await loadPerformanceData();
    let filteredData = data;

    if (month) filteredData = filteredData.filter(d => d.mes === month);
    if (week) filteredData = filteredData.filter(d => d.semana === week);
    if (day) filteredData = filteredData.filter(d => d.dia === day);
    if (subject) filteredData = filteredData.filter(d => d.materia === subject);

    const performanceBySubject = {};
    filteredData.forEach(d => {
        if (!performanceBySubject[d.materia]) {
            performanceBySubject[d.materia] = 0;
        }
        performanceBySubject[d.materia] += d.tempoTotal;
    });

    const totalMinutes = Object.values(performanceBySubject).reduce((sum, time) => sum + formatTimeMinutes(time), 0);
    const summaryText = document.getElementById('summaryText');
    const ctx = document.getElementById('performanceChart').getContext('2d');

    if (Object.keys(performanceBySubject).length === 0) {
        summaryText.textContent = 'Nenhum dado disponível para os filtros selecionados.';
        if (window.performanceChart) {
            window.performanceChart.destroy();
        }
        window.performanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Nenhum dado disponível',
                        font: {
                            size: 16
                        },
                        padding: {
                            top: 30,
                            bottom: 30
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Matéria'
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutos'
                        },
                        suggestedMax: 60
                    }
                }
            }
        });
    } else {
        summaryText.textContent = `Tempo total estudado: ${totalMinutes} minutos`;
        const labels = Object.keys(performanceBySubject);
        const times = Object.values(performanceBySubject).map(t => formatTimeMinutes(t));

        if (window.performanceChart) {
            window.performanceChart.destroy();
        }
        window.performanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tempo de Estudo (minutos)',
                    data: times,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutos'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Matéria'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    }
}

// Função para salvar estado do plano
function savePlanState(month, week, day) {
    const state = { month, week, day };
    localStorage.setItem('planState', JSON.stringify(state));
}



// Função para carregar conteúdo do plano (versão corrigida)
async function loadPlanContent(month, week, day) {
    const key = `${month}-${week}-${day}`;
    const contentArea = document.getElementById('contentArea');
    const contentDisplay = document.getElementById('contentDisplay');
    const editContentBtn = document.getElementById('editContentBtn');

    // Remover post-its existentes
    document.querySelectorAll('.postit').forEach(el => el.remove());

    try {
        const contentData = await loadContentData();

        if (contentData[key] && contentData[key].content) {
            // Conteúdo disponível - mostrar conteúdo e botão de edição
            contentDisplay.innerHTML = `
                <button id="editContentBtn" class="btn btn-primary edit-content-btn" style="display: inline-block; margin-bottom: 15px;">
                    <i class="bi bi-pencil-square"></i> Editar Conteúdo
                </button>
                <div class="content-wrapper">
                    ${contentData[key].content}
                </div>
            `;

            contentArea.style.display = 'block';

            // Configurar o botão de edição
            const newEditBtn = document.getElementById('editContentBtn');
            if (newEditBtn) {
                newEditBtn.dataset.key = key;
                newEditBtn.dataset.materia = contentData[key].materia || 'Desconhecida';

                // Adicionar event listener ao novo botão
                newEditBtn.addEventListener('click', function () {
                    const btnKey = this.dataset.key;
                    const btnMateria = this.dataset.materia;
                    const content = document.querySelector('.content-wrapper').innerHTML;
                    openEditContentModal(btnKey, btnMateria, content);
                });
            }

            // Carregar post-its para este dia
            await loadPostIts(key);

            // Renderizar MathJax se disponível
            if (typeof MathJax !== 'undefined') {
                MathJax.typeset();
            }

            console.log(`Conteúdo carregado para ${key}, matéria: ${contentData[key].materia}`);

        } else {
            // Conteúdo não disponível - mostrar mensagem e ocultar botão
            contentDisplay.innerHTML = `
                <div class="no-content-message">
                    <h3>Conteúdo não disponível</h3>
                    <p>Não há conteúdo cadastrado para este dia ainda.</p>
                    <button class="btn btn-outline-primary" onclick="createNewContent('${key}')">
                        <i class="bi bi-plus-circle"></i> Criar Conteúdo
                    </button>
                </div>
            `;
            contentArea.style.display = 'block';
        }
        // Atualizar barra de progresso inicial
        await updateProgressBar();
    } catch (error) {
        console.error('Erro ao carregar conteúdo do plano:', error);
        contentDisplay.innerHTML = `
            <div class="error-message">
                <h3>Erro ao carregar conteúdo</h3>
                <p>Ocorreu um erro ao tentar carregar o conteúdo. Tente novamente.</p>
            </div>
        `;
        contentArea.style.display = 'block';
    }
}

// Função para criar novo conteúdo
function createNewContent(key) {
    openEditContentModal(key, '', '<p>Digite o conteúdo aqui...</p>');
}

// Função para abrir o modal de edição de conteúdo (versão aprimorada)
function openEditContentModal(key, materia, content) {
    const modal = new bootstrap.Modal(document.getElementById('editContentModal'));
    const editMateria = document.getElementById('editContentMateria');
    const editContentHtml = document.getElementById('editContentHtml');
    const editContentKey = document.getElementById('editContentKey');

    // As opções já estão definidas no HTML, apenas selecionar a correta
    const options = editMateria.querySelectorAll('option');
    options.forEach(option => {
        option.selected = option.value === materia;
    });

    // Preencher campos
    editContentHtml.value = content || '';
    editContentKey.value = key;

    // Mostrar modal
    modal.show();

    console.log(`Modal aberto para edição - Key: ${key}, Matéria: ${materia}`);
}

// Função para salvar alterações do conteúdo (versão otimizada)
async function saveContentChanges(key, materia, content) {
    try {
        const db = await initDB();
        const transaction = db.transaction(['conteudos'], 'readwrite');
        const store = transaction.objectStore('conteudos');

        const data = {
            key: key,
            materia: materia,
            content: content,
            updatedAt: new Date().toISOString(),
            isCustom: true // Marca como conteúdo personalizado
        };

        return new Promise((resolve, reject) => {
            const request = store.put(data);

            request.onsuccess = () => {
                console.log('Conteúdo salvo com sucesso:', data);
                const [month, week, day] = key.split('-');
                loadPlanContent(month, week, day).then(() => {
                    showToast('Conteúdo atualizado com sucesso!');
                    resolve();
                });
            };

            request.onerror = () => {
                console.error('Erro ao salvar conteúdo:', request.error);
                showToast('Erro ao salvar conteúdo.');
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Erro ao salvar alterações do conteúdo:', error);
        showToast('Erro ao salvar alterações.');
        throw error;
    }
}

// Event listener para o formulário de edição (compatível com sua estrutura)
document.addEventListener('DOMContentLoaded', function () {
    const editContentForm = document.getElementById('editContentForm');

    if (editContentForm) {
        editContentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const key = document.getElementById('editContentKey').value;
            const materia = document.getElementById('editContentMateria').value;
            const content = document.getElementById('editContentHtml').value;

            // Validação
            if (!materia.trim()) {
                showToast('Por favor, selecione uma matéria.');
                return;
            }

            if (!content.trim()) {
                showToast('Por favor, adicione algum conteúdo.');
                return;
            }

            try {
                // Mostrar loading no botão
                const submitBtn = editContentForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Salvando...';
                submitBtn.disabled = true;

                await saveContentChanges(key, materia, content);

                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editContentModal'));
                modal.hide();

                // Restaurar botão
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;

            } catch (error) {
                console.error('Erro ao salvar:', error);
                showToast('Erro ao salvar. Tente novamente.');

                // Restaurar botão em caso de erro
                const submitBtn = editContentForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Salvar Alterações';
                submitBtn.disabled = false;
            }
        });
    }
});

// Função auxiliar para debug - verificar estado do botão
function debugEditButton() {
    const btn = document.getElementById('editContentBtn');
    if (btn) {
        console.log('Botão encontrado:', {
            display: window.getComputedStyle(btn).display,
            key: btn.dataset.key,
            materia: btn.dataset.materia,
            visible: btn.offsetParent !== null
        });
    } else {
        console.log('Botão não encontrado no DOM');
    }
}
//--------------------------------------------------------------------------
// Função para resetar todos os tempos de desempenho
async function resetAllTimes() {
    try {
        const db = await initDB();
        const transaction = db.transaction(['desempenho'], 'readwrite');
        const store = transaction.objectStore('desempenho');

        return new Promise((resolve, reject) => {
            const clearRequest = store.clear();

            clearRequest.onsuccess = () => {
                console.log('Todos os tempos de desempenho foram resetados');
                showToast('Todos os tempos foram resetados com sucesso!');

                // Atualizar a barra de progresso após reset
                updateProgressBar();

                // Atualizar o gráfico
                updateChart();

                resolve();
            };

            clearRequest.onerror = () => {
                console.error('Erro ao resetar tempos:', clearRequest.error);
                showToast('Erro ao resetar tempos.');
                reject(clearRequest.error);
            };
        });
    } catch (error) {
        console.error('Erro ao resetar tempos:', error);
        showToast('Erro ao resetar tempos.');
        throw error;
    }
}

// Função para resetar tempo de uma aula específica
async function resetSpecificTime(month, week, day) {
    try {
        const db = await initDB();
        const transaction = db.transaction(['desempenho'], 'readwrite');
        const store = transaction.objectStore('desempenho');
        const dayKey = `${month}-${week}-${day}`;

        const request = store.getAll();
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const records = request.result;
                const recordsToDelete = records.filter(record => {
                    const recordKey = `${record.mes}-${record.semana}-${record.dia}`;
                    return recordKey === dayKey;
                });

                // Deletar registros específicos
                const deletePromises = recordsToDelete.map(record => {
                    return new Promise((resolveDelete) => {
                        const deleteRequest = store.delete(record.id);
                        deleteRequest.onsuccess = () => resolveDelete();
                        deleteRequest.onerror = () => resolveDelete();
                    });
                });

                Promise.all(deletePromises).then(() => {
                    console.log(`Tempo resetado para: ${dayKey}`);
                    showToast(`Tempo da aula ${day} resetado com sucesso!`);

                    // Atualizar a barra de progresso após reset
                    updateProgressBar();

                    // Atualizar o gráfico
                    updateChart();

                    resolve();
                });
            };

            request.onerror = () => {
                console.error('Erro ao resetar tempo específico:', request.error);
                showToast('Erro ao resetar tempo da aula.');
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Erro ao resetar tempo específico:', error);
        showToast('Erro ao resetar tempo da aula.');
        throw error;
    }
}
//-------------------------------------------------------------------------------------------

//// Função para exportar todos os dados como JSON
async function exportData() {
    try {
        const db = await initDB();
        const transaction = db.transaction(['planos', 'desempenho', 'postits', 'conteudos'], 'readonly');
        const data = {
            planos: [],
            desempenho: [],
            postits: [],
            conteudos: [],
            materias: JSON.parse(localStorage.getItem('materias') || '[]')
        };

        // ...existing code...
        // Exportar planos
        const planosPromise = new Promise(resolve => {
            const planosStore = transaction.objectStore('planos');
            const planosRequest = planosStore.getAll();
            planosRequest.onsuccess = () => {
                data.planos = planosRequest.result;
                resolve();
            };
        });

        // Exportar desempenho
        const desempenhoPromise = new Promise(resolve => {
            const desempenhoStore = transaction.objectStore('desempenho');
            const desempenhoRequest = desempenhoStore.getAll();
            desempenhoRequest.onsuccess = () => {
                data.desempenho = desempenhoRequest.result;
                resolve();
            };
        });

        // Exportar post-its
        const postitsPromise = new Promise(resolve => {
            const postitsStore = transaction.objectStore('postits');
            const postitsRequest = postitsStore.getAll();
            postitsRequest.onsuccess = () => {
                data.postits = postitsRequest.result;
                resolve();
            };
        });

        // Exportar conteúdos
        const conteudosPromise = new Promise(resolve => {
            const conteudosStore = transaction.objectStore('conteudos');
            const conteudosRequest = conteudosStore.getAll();
            conteudosRequest.onsuccess = () => {
                data.conteudos = conteudosRequest.result;
                resolve();
            };
        });

        // Esperar todas as stores serem lidas
        await Promise.all([planosPromise, desempenhoPromise, postitsPromise, conteudosPromise]);

        // Baixar como JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plano_de_estudos_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Dados exportados com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        showToast('Erro ao exportar dados. Verifique o console.');
    }
}

//----------------------------------------------------------------
// Função para importar dados (suporta arquivo local e JSON remoto)
async function importData(dataOrFile) {
    try {
        let data;
        if (dataOrFile instanceof File) {
            // Importação de arquivo local
            const reader = new FileReader();
            data = await new Promise((resolve, reject) => {
                reader.onload = (e) => {
                    try {
                        resolve(JSON.parse(e.target.result));
                    } catch (error) {
                        reject(new Error('Arquivo JSON inválido: estrutura incorreta.'));
                    }
                };
                reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
                reader.readAsText(dataOrFile);
            });
        } else {
            // Importação de dados remotos
            data = dataOrFile;
        }

        // Validar estrutura do JSON
        if (!data.planos || !data.desempenho || !data.postits || !data.conteudos || !data.materias) {
            throw new Error('JSON inválido: estrutura incompleta.');
        }

        const db = await initDB();
        const transaction = db.transaction(['planos', 'desempenho', 'postits', 'conteudos'], 'readwrite');

        // Obter conteúdos personalizados existentes
        const conteudosStore = transaction.objectStore('conteudos');
        const conteudosRequest = conteudosStore.getAll();
        const customKeys = await new Promise((resolve) => {
            conteudosRequest.onsuccess = () => {
                const custom = conteudosRequest.result
                    .filter((conteudo) => conteudo.isCustom)
                    .map((conteudo) => conteudo.key);
                resolve(new Set(custom));
            };
            conteudosRequest.onerror = () => resolve(new Set());
        });

        // Limpar stores apenas para importação de arquivo local
        if (dataOrFile instanceof File) {
            transaction.objectStore('planos').clear();
            transaction.objectStore('desempenho').clear();
            transaction.objectStore('postits').clear();
            transaction.objectStore('conteudos').clear();
        }

        // Importar planos
        const planosStore = transaction.objectStore('planos');
        for (const plano of data.planos) {
            planosStore.add(plano);
        }

        // Importar desempenho
        const desempenhoStore = transaction.objectStore('desempenho');
        for (const desempenho of data.desempenho) {
            desempenhoStore.add(desempenho);
        }

        // Importar post-its
        const postitsStore = transaction.objectStore('postits');
        for (const postit of data.postits) {
            postit.materia = postit.materia || 'Desconhecida';
            postitsStore.add(postit);
        }

        // Importar conteúdos, exceto os personalizados
        for (const conteudo of data.conteudos) {
            if (!customKeys.has(conteudo.key)) {
                conteudosStore.add({ ...conteudo, isCustom: false });
            }
        }

        // Atualizar matérias no localStorage
        localStorage.setItem('materias', JSON.stringify(data.materias));

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                showToast('Dados importados com sucesso!');
                loadMaterias();
                updateChart();
                const savedState = localStorage.getItem('planState');
                if (savedState) {
                    const { month, week, day } = JSON.parse(savedState);
                    loadPlanContent(month, week, day);
                }
                resolve();
            };

            transaction.onerror = () => {
                console.error('Erro na transação de importação:', transaction.error);
                showToast('Erro ao importar dados. Verifique o console.');
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error('Erro ao importar dados:', error.message);
        showToast('Erro ao importar dados. Verifique o console.');
        throw error;
    }
}
//----------------------------------------------------------------------------------------------------------
// Função para verificar e importar atualizações do JSON remoto
async function checkAndUpdatePlan() {
    try {
        const db = await initDB();
        const transaction = db.transaction(['conteudos'], 'readonly');
        const store = transaction.objectStore('conteudos');
        const request = store.getAll();

        // Obter a data de atualização mais recente no IndexedDB
        let lastLocalUpdate = '1970-01-01T00:00:00.000Z';
        await new Promise((resolve) => {
            request.onsuccess = () => {
                const conteudos = request.result;
                conteudos.forEach((conteudo) => {
                    if (conteudo.updatedAt && conteudo.updatedAt > lastLocalUpdate) {
                        lastLocalUpdate = conteudo.updatedAt;
                    }
                });
                resolve();
            };
            request.onerror = () => resolve();
        });

        // Buscar o JSON remoto
        const remoteData = await fetchRemoteJSON();
        if (!remoteData) {
            // Carregar dados locais como fallback
            const savedState = localStorage.getItem('planState');
            if (savedState) {
                const { month, week, day } = JSON.parse(savedState);
                await loadPlanContent(month, week, day);
            }
            return;
        }

        // Verificar a data de atualização mais recente no JSON remoto
        let lastRemoteUpdate = '1970-01-01T00:00:00.000Z';
        remoteData.conteudos.forEach((conteudo) => {
            if (conteudo.updatedAt && conteudo.updatedAt > lastRemoteUpdate) {
                lastRemoteUpdate = conteudo.updatedAt;
            }
        });

        // Se houver atualização remota, notificar o usuário
        if (lastRemoteUpdate > lastLocalUpdate) {
            console.log('Nova versão do plano detectada.');
            showToast('Novos conteúdos disponíveis! Clique em "Atualizar Plano" para carregar.');
            // Armazenar os dados remotos em localStorage para importação manual
            localStorage.setItem('pendingRemoteData', JSON.stringify(remoteData));
        } else {
            console.log('Plano local está atualizado.');
            const savedState = localStorage.getItem('planState');
            if (savedState) {
                const { month, week, day } = JSON.parse(savedState);
                await loadPlanContent(month, week, day);
            }
        }
    } catch (error) {
        console.error('Erro ao verificar atualizações:', error.message);
        showToast('Erro ao verificar atualizações do plano. Usando dados locais.');
        const savedState = localStorage.getItem('planState');
        if (savedState) {
            const { month, week, day } = JSON.parse(savedState);
            await loadPlanContent(month, week, day);
        }
    }
}

//----------------------------------------------------------------------------
// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        console.log('Banco de dados inicializado.');

        // Verificar e importar atualizações do JSON remoto
        await checkAndUpdatePlan();

        // Carregar matérias
        await loadMaterias();

        // Configurar eventos existentes
        document.getElementById('timerButton').addEventListener('click', toggleTimer);

        document.getElementById('addPostit').addEventListener('click', async () => {
            const colors = ['yellow', 'pink', 'blue', 'green', 'purple'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            // Obter o estado atual do plano
            const savedState = localStorage.getItem('planState');
            let dayKey = 'junho-1-segunda';
            let materia = 'Desconhecida';

            if (savedState) {
                const { month, week, day } = JSON.parse(savedState);
                dayKey = `${month}-${week}-${day}`;
                const contentData = await loadContentData();
                materia = contentData[dayKey]?.materia || 'Desconhecida';
            }

            const postit = {
                dayKey: dayKey,
                materia: materia,
                content: '',
                color: color,
                x: 100,
                y: 100,
                width: 200,
                height: 200
            };

            try {
                const db = await initDB();
                const transaction = db.transaction(['postits'], 'readwrite');
                const store = transaction.objectStore('postits');
                const request = store.add(postit);
                request.onsuccess = () => {
                    postit.id = request.result;
                    createPostItElement(postit);
                };
                request.onerror = () => {
                    console.error('Erro ao adicionar post-it:', request.error);
                    showToast('Erro ao adicionar post-it.');
                };
            } catch (error) {
                console.error('Erro ao adicionar post-it:', error.message);
                showToast('Erro ao adicionar post-it.');
            }
        });

        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const month = e.target.getAttribute('data-month');
                const week = e.target.getAttribute('data-week');
                const day = e.target.getAttribute('data-day');
                if (month && week && day) {
                    savePlanState(month, week, day);
                    await loadPlanContent(month, week, day);
                    await updateProgressBar();
                    clearInterval(studyTimer);
                    studySeconds = 0;
                    isRunning = false;
                    document.getElementById('timerDisplay').textContent = '00:00:00';
                    document.getElementById('progressBar').style.width = '0%';
                    document.getElementById('progressBar').setAttribute('aria-valuenow', '0');
                    document.getElementById('timerButton').innerHTML = '<i class="bi bi-play-fill"></i> Iniciar';
                    if (performanceStart) {
                        const key = `${month}-${week}-${day}`;
                        const contentData = await loadContentData();
                        const materia = contentData[key]?.materia || 'Desconhecida';
                        await savePerformance(month, week, day, materia, performanceStart);
                        clearInterval(performanceTimer);
                        performanceStart = null;
                    }
                }
            });
        });

        document.getElementById('monthFilter').addEventListener('change', updateChart);
        document.getElementById('weekFilter').addEventListener('change', updateChart);
        document.getElementById('dayFilter').addEventListener('change', updateChart);
        document.getElementById('subjectFilter').addEventListener('change', updateChart);

        document.getElementById('exportData').addEventListener('click', exportData);
        document.getElementById('importData').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importData(e.target.files[0]);
            }
        });

        document.getElementById('resetAllTimes').addEventListener('click', () => {
            if (confirm('Tem certeza que deseja resetar TODOS os tempos de estudo? Esta ação não pode ser desfeita.')) {
                resetAllTimes();
            }
        });

        document.getElementById('resetCurrentTime').addEventListener('click', () => {
            const savedState = localStorage.getItem('planState');
            if (savedState) {
                const { month, week, day } = JSON.parse(savedState);
                if (confirm(`Tem certeza que deseja resetar o tempo da aula ${day}? Esta ação não pode ser desfeita.`)) {
                    resetSpecificTime(month, week, day);
                }
            } else {
                showToast('Nenhuma aula selecionada para resetar.');
            }
        });

        document.getElementById('closePage').addEventListener('click', () => {
            const contentArea = document.getElementById('contentArea');
            if (window.getComputedStyle(contentArea).display === 'block') {
                contentArea.style.display = 'none';
            }
        });

        const dashboardModal = document.getElementById('dashboardModal');
        dashboardModal.addEventListener('shown.bs.modal', updateChart);

        // Ativa tooltips do Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));


        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // Exemplo de plano (removido, pois será carregado do JSON remoto)
        // const exemploPlano = { ... };
        // await addPlano(exemploPlano);
        //-----------------------------------------------------------------------
        document.getElementById('updatePlan').addEventListener('click', async () => {
            const pendingData = localStorage.getItem('pendingRemoteData');
            if (pendingData) {
                if (confirm('Atualizar o plano pode sobrescrever conteúdos não personalizados. Deseja continuar?')) {
                    try {
                        showToast('Importando novo plano...');
                        await importData(JSON.parse(pendingData));
                        localStorage.removeItem('pendingRemoteData');
                        showToast('Plano atualizado com sucesso!');
                    } catch (error) {
                        console.error('Erro ao importar plano remoto:', error);
                        showToast('Erro ao atualizar o plano. Verifique o console.');
                    }
                }
            } else {
                showToast('Nenhuma atualização pendente. Verificando novas versões...');
                await checkAndUpdatePlan();
            }
        });
        //------------------------------------------------------------------------

    } catch (error) {
        console.error('Erro na inicialização do aplicativo:', error.message);
        showToast('Erro ao inicializar o aplicativo. Verifique o console.');
    }

    window.addEventListener('beforeunload', async () => {
        if (performanceStart) {
            const savedState = localStorage.getItem('planState');
            if (savedState) {
                const { month, week, day } = JSON.parse(savedState);
                await savePerformance(month, week, day, 'Matemática', performanceStart);
            }
        }
    });
});

// Botão de retorno ao topo
window.onload = function () {
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 100) {
            document.querySelector('.back-to-top').style.display = 'block';
        } else {
            document.querySelector('.back-to-top').style.display = 'none';
        }
    });
};

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}