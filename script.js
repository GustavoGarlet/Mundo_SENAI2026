/* =====================================================
   SISTEMA DE CONTROLE DE PÚBLICO
   FEIRA ESCOLAR

   Funcionamento:
   - Offline
   - LocalStorage
   - Contagem manual
   - Preparado para Arduino
   - Arquivamento de períodos
   ===================================================== */


/* =====================================================
   CONFIGURAÇÃO
===================================================== */

const STORAGE_KEY = "feira_escolar_dados_v2";


/* =====================================================
   ESTADO INICIAL
===================================================== */

function criarPeriodo(nome = "Período atual") {

    return {

        id: Date.now() + Math.random(),

        nome: nome,

        inicio: new Date().toISOString(),

        fim: null,

        presentes: 0,

        entradas: 0,

        saidas: 0,

        maiorPublico: 0,

        movimentacoes: [],

        grafico: []

    };

}


function criarEstadoInicial() {

    return {

        periodoAtual: criarPeriodo(),

        periodosSalvos: []

    };

}


let estado = carregarDados();


/* =====================================================
   CARREGAR DADOS
===================================================== */

function carregarDados() {

    try {

        const dadosSalvos =
            localStorage.getItem(STORAGE_KEY);


        if (!dadosSalvos) {

            return criarEstadoInicial();

        }


        const dados =
            JSON.parse(dadosSalvos);


        /*
         * Compatibilidade caso exista uma versão
         * anterior do sistema.
         */

        if (
            dados.periodoAtual &&
            Array.isArray(dados.periodosSalvos)
        ) {

            return dados;

        }


        return criarEstadoInicial();

    }

    catch (erro) {

        console.error(
            "Erro ao carregar dados:",
            erro
        );

        return criarEstadoInicial();

    }

}


/* =====================================================
   SALVAR
===================================================== */

function salvarDados() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(estado)
    );

}


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        atualizarRelogio();

        setInterval(
            atualizarRelogio,
            1000
        );


        atualizarDashboard();

        renderUltimasMovimentacoes();

        renderMovimentacoes();

        renderPeriodosArquivados();

        desenharGrafico();

    }
);


/* =====================================================
   RELÓGIO
===================================================== */

function atualizarRelogio() {

    const agora = new Date();


    const data =
        agora.toLocaleDateString(
            "pt-BR",
            {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );


    const hora =
        agora.toLocaleTimeString(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );


    const dataElemento =
        document.getElementById(
            "dataAtual"
        );


    const horaElemento =
        document.getElementById(
            "horaAtual"
        );


    if (dataElemento) {

        dataElemento.textContent =
            data.charAt(0).toUpperCase() +
            data.slice(1);

    }


    if (horaElemento) {

        horaElemento.textContent =
            hora;

    }

}


/* =====================================================
   NAVEGAÇÃO
===================================================== */

function abrirPagina(
    pagina,
    botao = null
) {

    document
        .querySelectorAll(".page")
        .forEach(
            page => {

                page.classList.remove(
                    "active"
                );

            }
        );


    const paginaSelecionada =
        document.getElementById(
            `pagina-${pagina}`
        );


    if (paginaSelecionada) {

        paginaSelecionada.classList.add(
            "active"
        );

    }


    document
        .querySelectorAll(".menu-item")
        .forEach(
            item => {

                item.classList.remove(
                    "active"
                );

            }
        );


    if (botao) {

        botao.classList.add(
            "active"
        );

    }


    const titulos = {

        dashboard: "Dashboard",

        movimentacoes:
            "Movimentações",

        arquivos:
            "Períodos arquivados",

        configuracoes:
            "Configurações"

    };


    const titulo =
        document.getElementById(
            "tituloPagina"
        );


    if (titulo) {

        titulo.textContent =
            titulos[pagina] ||
            "Dashboard";

    }


    if (pagina === "movimentacoes") {

        renderMovimentacoes();

    }


    if (pagina === "arquivos") {

        renderPeriodosArquivados();

    }

}


/* =====================================================
   ENTRADA MANUAL
===================================================== */

function registrarEntrada() {

    registrarMovimento(
        "ENTRADA",
        "MANUAL"
    );

}


/* =====================================================
   SAÍDA MANUAL
===================================================== */

function registrarSaida() {

    registrarMovimento(
        "SAIDA",
        "MANUAL"
    );

}


/* =====================================================
   REGISTRAR MOVIMENTO
===================================================== */

function registrarMovimento(
    tipo,
    origem = "ARDUINO"
) {

    const periodo =
        estado.periodoAtual;


    /*
     * Impede que o número de pessoas
     * fique negativo.
     */

    if (
        tipo === "SAIDA" &&
        periodo.presentes <= 0
    ) {

        mostrarToast(
            "Atenção",
            "Não é possível registrar saída quando não há pessoas no local.",
            "⚠"
        );

        return;

    }


    /* ENTRADA */

    if (tipo === "ENTRADA") {

        periodo.entradas++;

        periodo.presentes++;

    }


    /* SAÍDA */

    if (tipo === "SAIDA") {

        periodo.saidas++;

        periodo.presentes--;

    }


    /*
     * Atualiza maior público.
     */

    if (
        periodo.presentes >
        periodo.maiorPublico
    ) {

        periodo.maiorPublico =
            periodo.presentes;

    }


    /* Data atual */

    const agora = new Date();


    /*
     * Cria registro.
     */

    const movimentacao = {

        id:
            Date.now() +
            Math.random(),

        data:
            agora.toISOString(),

        tipo:
            tipo,

        origem:
            origem,

        presentes:
            periodo.presentes

    };


    periodo.movimentacoes.push(
        movimentacao
    );


    /*
     * Adiciona ponto ao gráfico.
     */

    periodo.grafico.push({

        hora:
            agora.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ),

        entradas:
            periodo.entradas,

        saidas:
            periodo.saidas,

        presentes:
            periodo.presentes

    });


    /*
     * Mantém no máximo 100 pontos
     * para não deixar o gráfico pesado.
     */

    if (
        periodo.grafico.length >
        100
    ) {

        periodo.grafico.shift();

    }


    salvarDados();


    atualizarDashboard();

    renderUltimasMovimentacoes();

    renderMovimentacoes();

    desenharGrafico();


    if (tipo === "ENTRADA") {

        mostrarToast(
            "Entrada registrada",
            `Público atual: ${periodo.presentes}`,
            "↗"
        );

    }

    else {

        mostrarToast(
            "Saída registrada",
            `Público atual: ${periodo.presentes}`,
            "↙"
        );

    }

}


/* =====================================================
   DASHBOARD
===================================================== */

function atualizarDashboard() {

    const periodo =
        estado.periodoAtual;


    const pessoas =
        document.getElementById(
            "pessoasPresentes"
        );


    const entradas =
        document.getElementById(
            "totalEntradas"
        );


    const saidas =
        document.getElementById(
            "totalSaidas"
        );


    const pico =
        document.getElementById(
            "maiorPublico"
        );


    const contador =
        document.getElementById(
            "contadorControle"
        );


    if (pessoas) {

        pessoas.textContent =
            periodo.presentes;

    }


    if (entradas) {

        entradas.textContent =
            periodo.entradas;

    }


    if (saidas) {

        saidas.textContent =
            periodo.saidas;

    }


    if (pico) {

        pico.textContent =
            periodo.maiorPublico;

    }


    if (contador) {

        contador.textContent =
            periodo.presentes;

    }


    const nomePeriodo =
        document.getElementById(
            "nomePeriodoAtual"
        );


    const bannerPeriodo =
        document.getElementById(
            "bannerPeriodo"
        );


    if (nomePeriodo) {

        nomePeriodo.textContent =
            periodo.nome;

    }


    if (bannerPeriodo) {

        bannerPeriodo.textContent =
            periodo.nome;

    }


    const vazio =
        document.getElementById(
            "graficoVazio"
        );


    if (vazio) {

        if (
            periodo.grafico.length === 0
        ) {

            vazio.style.display =
                "flex";

        }

        else {

            vazio.style.display =
                "none";

        }

    }

}


/* =====================================================
   ÚLTIMAS MOVIMENTAÇÕES
===================================================== */

function renderUltimasMovimentacoes() {

    const container =
        document.getElementById(
            "ultimasMovimentacoes"
        );


    if (!container) return;


    const movimentacoes =
        estado.periodoAtual.movimentacoes;


    if (
        movimentacoes.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                Nenhuma movimentação registrada.
            </div>
        `;

        return;

    }


    const ultimas =
        [...movimentacoes]
            .reverse()
            .slice(0, 8);


    container.innerHTML =
        ultimas
            .map(
                movimento => {

                    const entrada =
                        movimento.tipo ===
                        "ENTRADA";


                    const data =
                        new Date(
                            movimento.data
                        );


                    const horario =
                        data.toLocaleTimeString(
                            "pt-BR",
                            {
                                hour:
                                    "2-digit",

                                minute:
                                    "2-digit",

                                second:
                                    "2-digit"
                            }
                        );


                    return `

                        <div class="movement-row">

                            <div class="movement-main">

                                <div
                                    class="
                                        movement-symbol
                                        ${entrada ? "entry" : "exit"}
                                    "
                                >
                                    ${entrada ? "↗" : "↙"}
                                </div>


                                <div>

                                    <strong>
                                        ${entrada ? "Entrada" : "Saída"}
                                    </strong>

                                    <small>
                                        ${movimento.origem}
                                    </small>

                                </div>

                            </div>


                            <div class="movement-time">

                                ${horario}

                            </div>


                            <div class="movement-people">

                                ${movimento.presentes}

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =====================================================
   TABELA DE MOVIMENTAÇÕES
===================================================== */

function renderMovimentacoes() {

    const tabela =
        document.getElementById(
            "tabelaMovimentacoes"
        );


    if (!tabela) return;


    const tipoFiltro =
        document.getElementById(
            "filtroTipo"
        )?.value || "TODOS";


    const dataFiltro =
        document.getElementById(
            "filtroData"
        )?.value || "";


    let movimentacoes =
        [...estado.periodoAtual.movimentacoes];


    if (
        tipoFiltro !== "TODOS"
    ) {

        movimentacoes =
            movimentacoes.filter(
                movimento =>
                    movimento.tipo ===
                    tipoFiltro
            );

    }


    if (dataFiltro) {

        movimentacoes =
            movimentacoes.filter(
                movimento => {

                    const data =
                        new Date(
                            movimento.data
                        );


                    const ano =
                        data.getFullYear();


                    const mes =
                        String(
                            data.getMonth() + 1
                        )
                        .padStart(2, "0");


                    const dia =
                        String(
                            data.getDate()
                        )
                        .padStart(2, "0");


                    const dataFormatada =
                        `${ano}-${mes}-${dia}`;


                    return (
                        dataFormatada ===
                        dataFiltro
                    );

                }
            );

    }


    movimentacoes.reverse();


    if (
        movimentacoes.length === 0
    ) {

        tabela.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        color:#6b7280;
                        padding:35px;
                    "
                >
                    Nenhum registro encontrado.
                </td>

            </tr>

        `;

        return;

    }


    tabela.innerHTML =
        movimentacoes
            .map(
                movimento => {

                    const data =
                        new Date(
                            movimento.data
                        );


                    const dataFormatada =
                        data.toLocaleDateString(
                            "pt-BR"
                        );


                    const hora =
                        data.toLocaleTimeString(
                            "pt-BR",
                            {
                                hour:
                                    "2-digit",

                                minute:
                                    "2-digit",

                                second:
                                    "2-digit"
                            }
                        );


                    const entrada =
                        movimento.tipo ===
                        "ENTRADA";


                    return `

                        <tr>

                            <td>
                                ${dataFormatada}
                            </td>

                            <td>
                                ${hora}
                            </td>

                            <td>

                                <span
                                    class="
                                        type-badge
                                        ${entrada
                                            ? "type-entry"
                                            : "type-exit"
                                        }
                                    "
                                >
                                    ${entrada
                                        ? "ENTRADA"
                                        : "SAÍDA"
                                    }
                                </span>

                            </td>

                            <td>

                                <span class="origin-badge">
                                    ${movimento.origem}
                                </span>

                            </td>

                            <td>
                                <strong>
                                    ${movimento.presentes}
                                </strong>
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =====================================================
   FILTROS
===================================================== */

document.addEventListener(
    "change",
    function (event) {

        if (
            event.target.id ===
            "filtroTipo"
        ) {

            renderMovimentacoes();

        }


        if (
            event.target.id ===
            "filtroData"
        ) {

            renderMovimentacoes();

        }

    }
);


function limparFiltros() {

    const tipo =
        document.getElementById(
            "filtroTipo"
        );


    const data =
        document.getElementById(
            "filtroData"
        );


    if (tipo) {

        tipo.value = "TODOS";

    }


    if (data) {

        data.value = "";

    }


    renderMovimentacoes();

}


/* =====================================================
   GRÁFICO
===================================================== */

function desenharGrafico() {

    const canvas =
        document.getElementById(
            "graficoMovimento"
        );


    if (!canvas) return;


    const container =
        canvas.parentElement;


    const largura =
        container.clientWidth - 40;


    const altura =
        container.clientHeight - 30;


    const proporcao =
        window.devicePixelRatio || 1;


    canvas.width =
        largura * proporcao;


    canvas.height =
        altura * proporcao;


    canvas.style.width =
        largura + "px";


    canvas.style.height =
        altura + "px";


    const ctx =
        canvas.getContext("2d");


    ctx.scale(
        proporcao,
        proporcao
    );


    ctx.clearRect(
        0,
        0,
        largura,
        altura
    );


    const dados =
        estado.periodoAtual.grafico;


    if (
        dados.length === 0
    ) {

        return;

    }


    desenharLinhasGrafico(
        ctx,
        dados,
        largura,
        altura
    );

}


/* =====================================================
   DESENHO DO GRÁFICO
===================================================== */

function desenharLinhasGrafico(
    ctx,
    dados,
    largura,
    altura
) {

    const margemEsquerda = 38;

    const margemDireita = 15;

    const margemSuperior = 15;

    const margemInferior = 30;


    const areaLargura =
        largura -
        margemEsquerda -
        margemDireita;


    const areaAltura =
        altura -
        margemSuperior -
        margemInferior;


    const maiorValor =
        Math.max(
            5,
            ...dados.map(
                item =>
                    Math.max(
                        item.entradas,
                        item.saidas
                    )
            )
        );


    /*
     * Grade
     */

    ctx.strokeStyle =
        "#eef1f4";

    ctx.lineWidth = 1;


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const y =
            margemSuperior +
            (
                areaAltura *
                i /
                4
            );


        ctx.beginPath();

        ctx.moveTo(
            margemEsquerda,
            y
        );

        ctx.lineTo(
            largura -
            margemDireita,
            y
        );

        ctx.stroke();


        ctx.fillStyle =
            "#94a3b8";

        ctx.font =
            "9px Arial";

        const valor =
            Math.round(
                maiorValor *
                (1 - i / 4)
            );


        ctx.fillText(
            valor,
            5,
            y + 3
        );

    }


    function criarPontos(chave) {

        return dados.map(
            (item, indice) => {

                const x =
                    margemEsquerda +
                    (
                        indice /
                        Math.max(
                            1,
                            dados.length - 1
                        )
                    ) *
                    areaLargura;


                const y =
                    margemSuperior +
                    areaAltura -
                    (
                        item[chave] /
                        maiorValor
                    ) *
                    areaAltura;


                return {
                    x,
                    y
                };

            }
        );

    }


    function desenharLinha(
        pontos,
        cor
    ) {

        if (
            pontos.length === 0
        ) return;


        ctx.beginPath();


        pontos.forEach(
            (ponto, indice) => {

                if (indice === 0) {

                    ctx.moveTo(
                        ponto.x,
                        ponto.y
                    );

                }

                else {

                    ctx.lineTo(
                        ponto.x,
                        ponto.y
                    );

                }

            }
        );


        ctx.strokeStyle =
            cor;

        ctx.lineWidth = 2;

        ctx.stroke();


        pontos.forEach(
            ponto => {

                ctx.beginPath();

                ctx.arc(
                    ponto.x,
                    ponto.y,
                    3,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    cor;

                ctx.fill();

            }
        );

    }


    const entradas =
        criarPontos(
            "entradas"
        );


    const saidas =
        criarPontos(
            "saidas"
        );


    desenharLinha(
        entradas,
        "#15966b"
    );


    desenharLinha(
        saidas,
        "#e28b35"
    );


    /*
     * Horários no eixo X
     */

    ctx.fillStyle =
        "#94a3b8";

    ctx.font =
        "9px Arial";


    const passo =
        Math.max(
            1,
            Math.floor(
                dados.length / 5
            )
        );


    for (
        let i = 0;
        i < dados.length;
        i += passo
    ) {

        const ponto =
            entradas[i];


        if (!ponto) continue;


        ctx.fillText(
            dados[i].hora,
            ponto.x - 12,
            altura - 8
        );

    }

}


/* =====================================================
   EXPORTAR CSV DO PERÍODO ATUAL
===================================================== */

function exportarCSV() {

    exportarPeriodoCSV(
        estado.periodoAtual
    );

}


/* =====================================================
   EXPORTAR QUALQUER PERÍODO
===================================================== */

function exportarPeriodoCSV(
    periodo
) {

    if (
        !periodo ||
        periodo.movimentacoes.length === 0
    ) {

        mostrarToast(
            "Sem dados",
            "Este período não possui movimentações para exportar.",
            "!"
        );

        return;

    }


    let csv =
        "Data,Hora,Tipo,Origem,Pessoas no local\n";


    periodo.movimentacoes.forEach(
        movimento => {

            const data =
                new Date(
                    movimento.data
                );


            const dataFormatada =
                data.toLocaleDateString(
                    "pt-BR"
                );


            const hora =
                data.toLocaleTimeString(
                    "pt-BR"
                );


            csv +=
                `"${dataFormatada}","${hora}","${movimento.tipo}","${movimento.origem}","${movimento.presentes}"\n`;

        }
    );


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement("a");


    link.href =
        url;


    link.download =
        `${limparNomeArquivo(periodo.nome)}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );


    mostrarToast(
        "CSV exportado",
        "O arquivo foi gerado com sucesso.",
        "✓"
    );

}


/* =====================================================
   LIMPAR NOME DO ARQUIVO
===================================================== */

function limparNomeArquivo(
    nome
) {

    return nome
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-zA-Z0-9]/g,
            "_"
        );

}


/* =====================================================
   ARDUINO
===================================================== */

/*
 * Esta função apenas simula a conexão.
 *
 * Quando o Arduino for integrado,
 * ele poderá chamar:
 *
 * receberArduino("ENTRADA")
 *
 * ou:
 *
 * receberArduino("SAIDA")
 */

function simularConexaoArduino() {

    const indicador =
        document.getElementById(
            "arduinoIndicador"
        );


    const texto =
        document.getElementById(
            "arduinoTexto"
        );


    const config =
        document.getElementById(
            "configStatusArduino"
        );


    indicador.classList.remove(
        "offline"
    );


    indicador.classList.add(
        "online"
    );


    texto.textContent =
        "Arduino conectado";


    if (config) {

        config.textContent =
            "● Conectado";

        config.style.color =
            "#15966b";

    }


    mostrarToast(
        "Arduino conectado",
        "Modo de teste ativado.",
        "✓"
    );

}


/* =====================================================
   RECEBER DADOS DO ARDUINO
===================================================== */

function receberArduino(
    dado
) {

    const valor =
        String(dado)
            .trim()
            .toUpperCase();


    if (
        valor === "ENTRADA"
    ) {

        registrarMovimento(
            "ENTRADA",
            "ARDUINO"
        );

        return;

    }


    if (
        valor === "SAIDA" ||
        valor === "SAÍDA"
    ) {

        registrarMovimento(
            "SAIDA",
            "ARDUINO"
        );

        return;

    }


    console.warn(
        "Comando Arduino não reconhecido:",
        dado
    );

}


/* =====================================================
   MODAL DE ARQUIVAMENTO
===================================================== */

function abrirModalArquivamento() {

    const modal =
        document.getElementById(
            "modalArquivamento"
        );


    const input =
        document.getElementById(
            "nomePeriodoInput"
        );


    const periodo =
        estado.periodoAtual;


    /*
     * Sugere automaticamente:
     * Período 01
     * Período 02
     * etc.
     */

    const numero =
        estado.periodosSalvos.length + 1;


    input.value =
        periodo.movimentacoes.length > 0
            ? `Período ${String(numero).padStart(2, "0")}`
            : "";


    document.getElementById(
        "modalEntradas"
    ).textContent =
        periodo.entradas;


    document.getElementById(
        "modalSaidas"
    ).textContent =
        periodo.saidas;


    document.getElementById(
        "modalPico"
    ).textContent =
        periodo.maiorPublico;


    modal.classList.add(
        "show"
    );


    setTimeout(
        () => {

            input.focus();

        },
        100
    );

}


function fecharModalArquivamento() {

    document
        .getElementById(
            "modalArquivamento"
        )
        .classList.remove(
            "show"
        );

}


/* =====================================================
   CONFIRMAR ARQUIVAMENTO
===================================================== */

function confirmarArquivamento() {

    const input =
        document.getElementById(
            "nomePeriodoInput"
        );


    let nome =
        input.value.trim();


    if (!nome) {

        nome =
            `Período ${
                String(
                    estado.periodosSalvos.length + 1
                ).padStart(2, "0")
            }`;

    }


    const periodoAtual =
        estado.periodoAtual;


    /*
     * Não deixa criar arquivo vazio.
     */

    if (
        periodoAtual.movimentacoes.length === 0
    ) {

        const confirmar =
            confirm(
                "Este período ainda não possui movimentações. Deseja arquivá-lo mesmo assim?"
            );


        if (!confirmar) {

            return;

        }

    }


    /*
     * Define data final.
     */

    periodoAtual.fim =
        new Date().toISOString();


    periodoAtual.nome =
        nome;


    /*
     * Cria uma cópia completa
     * do período.
     *
     * Isso é importante para que
     * o novo período não altere
     * o período arquivado.
     */

    const periodoArquivado =
        JSON.parse(
            JSON.stringify(
                periodoAtual
            )
        );


    estado.periodosSalvos.push(
        periodoArquivado
    );


    /*
     * Cria novo período do zero.
     */

    estado.periodoAtual =
        criarPeriodo(
            "Período atual"
        );


    salvarDados();


    /*
     * Atualiza toda a interface.
     */

    atualizarDashboard();

    renderUltimasMovimentacoes();

    renderMovimentacoes();

    renderPeriodosArquivados();

    desenharGrafico();


    fecharModalArquivamento();


    mostrarToast(
        "Período arquivado",
        `"${nome}" foi salvo e uma nova contagem começou.`,
        "📦"
    );

}


/* =====================================================
   RENDERIZAR PERÍODOS ARQUIVADOS
===================================================== */

function renderPeriodosArquivados() {

    const container =
        document.getElementById(
            "listaPeriodosArquivados"
        );


    if (!container) return;


    const periodos =
        [...estado.periodosSalvos]
            .reverse();


    if (
        periodos.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-periodos">

                <div>
                    📦
                </div>

                <strong>
                    Nenhum período arquivado
                </strong>

                <p>
                    Quando você arquivar um período, ele aparecerá aqui.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        periodos
            .map(
                (periodo, index) => {

                    const inicio =
                        new Date(
                            periodo.inicio
                        );


                    const fim =
                        periodo.fim
                            ? new Date(
                                periodo.fim
                            )
                            : null;


                    const inicioTexto =
                        inicio.toLocaleString(
                            "pt-BR",
                            {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        );


                    const fimTexto =
                        fim
                            ? fim.toLocaleTimeString(
                                "pt-BR",
                                {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                }
                            )
                            : "-";


                    return `

                        <div class="periodo-card">

                            <div class="periodo-card-top">

                                <div class="periodo-card-title">

                                    <div class="periodo-card-icon">
                                        📦
                                    </div>

                                    <div>

                                        <h3>
                                            ${escapeHTML(periodo.nome)}
                                        </h3>

                                        <small>
                                            ${inicioTexto}
                                            →
                                            ${fimTexto}
                                        </small>

                                    </div>

                                </div>


                                <span class="periodo-number">
                                    #${estado.periodosSalvos.length - index}
                                </span>

                            </div>


                            <div class="periodo-card-stats">

                                <div class="periodo-mini-stat">

                                    <span>
                                        Entradas
                                    </span>

                                    <strong>
                                        ${periodo.entradas}
                                    </strong>

                                </div>


                                <div class="periodo-mini-stat">

                                    <span>
                                        Saídas
                                    </span>

                                    <strong>
                                        ${periodo.saidas}
                                    </strong>

                                </div>


                                <div class="periodo-mini-stat">

                                    <span>
                                        Pico
                                    </span>

                                    <strong>
                                        ${periodo.maiorPublico}
                                    </strong>

                                </div>

                            </div>


                            <div class="periodo-card-actions">

                                <button
                                    class="btn-primary"
                                    onclick="verPeriodoArquivado('${periodo.id}')"
                                >
                                    Ver período
                                </button>


                                <button
                                    class="btn-secondary"
                                    onclick="exportarPeriodoPorId('${periodo.id}')"
                                >
                                    Exportar CSV
                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escapeHTML(
    texto
) {

    return String(texto)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =====================================================
   BUSCAR PERÍODO PELO ID
===================================================== */

function encontrarPeriodo(
    id
) {

    return estado.periodosSalvos.find(
        periodo =>
            String(periodo.id) ===
            String(id)
    );

}


/* =====================================================
   VER PERÍODO ARQUIVADO
===================================================== */

let periodoModalAtual = null;


function verPeriodoArquivado(
    id
) {

    const periodo =
        encontrarPeriodo(id);


    if (!periodo) {

        mostrarToast(
            "Erro",
            "Período não encontrado.",
            "!"
        );

        return;

    }


    periodoModalAtual =
        periodo;


    document.getElementById(
        "tituloPeriodoArquivado"
    ).textContent =
        periodo.nome;


    const inicio =
        new Date(
            periodo.inicio
        );


    const fim =
        periodo.fim
            ? new Date(
                periodo.fim
            )
            : null;


    document.getElementById(
        "infoPeriodoArquivado"
    ).textContent =
        `Início: ${
            inicio.toLocaleString(
                "pt-BR"
            )
        }${
            fim
                ? ` • Final: ${
                    fim.toLocaleString(
                        "pt-BR"
                    )
                }`
                : ""
        }`;


    document.getElementById(
        "statsPeriodoArquivado"
    ).innerHTML = `

        <div>

            <span>
                Entradas
            </span>

            <strong>
                ${periodo.entradas}
            </strong>

        </div>


        <div>

            <span>
                Saídas
            </span>

            <strong>
                ${periodo.saidas}
            </strong>

        </div>


        <div>

            <span>
                Pico
            </span>

            <strong>
                ${periodo.maiorPublico}
            </strong>

        </div>

    `;


    renderGraficoArquivado(
        periodo
    );


    renderRegistrosArquivados(
        periodo
    );


    document.getElementById(
        "btnExportarPeriodo"
    ).onclick =
        function () {

            exportarPeriodoCSV(
                periodo
            );

        };


    document
        .getElementById(
            "modalPeriodoArquivado"
        )
        .classList.add(
            "show"
        );

}


/* =====================================================
   FECHAR MODAL DO ARQUIVO
===================================================== */

function fecharModalPeriodoArquivado() {

    document
        .getElementById(
            "modalPeriodoArquivado"
        )
        .classList.remove(
            "show"
        );


    periodoModalAtual =
        null;

}


/* =====================================================
   GRÁFICO DO PERÍODO ARQUIVADO
===================================================== */

function renderGraficoArquivado(
    periodo
) {

    const canvas =
        document.getElementById(
            "graficoPeriodoArquivado"
        );


    if (!canvas) return;


    const container =
        canvas.parentElement;


    const largura =
        container.clientWidth - 20;


    const altura =
        container.clientHeight - 20;


    const proporcao =
        window.devicePixelRatio || 1;


    canvas.width =
        largura * proporcao;


    canvas.height =
        altura * proporcao;


    canvas.style.width =
        largura + "px";


    canvas.style.height =
        altura + "px";


    const ctx =
        canvas.getContext("2d");


    ctx.scale(
        proporcao,
        proporcao
    );


    ctx.clearRect(
        0,
        0,
        largura,
        altura
    );


    const dados =
        periodo.grafico;


    if (
        dados.length === 0
    ) {

        ctx.fillStyle =
            "#94a3b8";

        ctx.font =
            "12px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "Sem dados para exibir",
            largura / 2,
            altura / 2
        );

        return;

    }


    desenharLinhasGrafico(
        ctx,
        dados,
        largura,
        altura
    );

}


/* =====================================================
   REGISTROS DO ARQUIVO
===================================================== */

function renderRegistrosArquivados(
    periodo
) {

    const container =
        document.getElementById(
            "registrosPeriodoArquivado"
        );


    if (!container) return;


    const registros =
        [...periodo.movimentacoes]
            .reverse();


    if (
        registros.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">
                Nenhuma movimentação neste período.
            </div>

        `;

        return;

    }


    container.innerHTML =
        registros
            .map(
                registro => {

                    const data =
                        new Date(
                            registro.data
                        );


                    const entrada =
                        registro.tipo ===
                        "ENTRADA";


                    return `

                        <div class="archive-record">

                            <div class="archive-record-left">

                                <span
                                    class="
                                        archive-record-dot
                                        ${entrada
                                            ? "entry"
                                            : "exit"
                                        }
                                    "
                                ></span>


                                <span>

                                    ${entrada
                                        ? "Entrada"
                                        : "Saída"
                                    }

                                    -
                                    ${registro.origem}

                                </span>

                            </div>


                            <strong>

                                ${data.toLocaleTimeString(
                                    "pt-BR"
                                )}

                                ·

                                ${registro.presentes}
                                pessoas

                            </strong>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =====================================================
   EXPORTAR PERÍODO PELO ID
===================================================== */

function exportarPeriodoPorId(
    id
) {

    const periodo =
        encontrarPeriodo(id);


    if (!periodo) {

        mostrarToast(
            "Erro",
            "Período não encontrado.",
            "!"
        );

        return;

    }


    exportarPeriodoCSV(
        periodo
    );

}


/* =====================================================
   NOVO EVENTO / COMPATIBILIDADE
===================================================== */

function novoEvento() {

    abrirModalArquivamento();

}


/* =====================================================
   APAGAR TODOS OS DADOS
===================================================== */

function apagarDados() {

    const confirmar =
        confirm(
            "ATENÇÃO!\n\nIsso apagará o período atual e TODOS os períodos arquivados.\n\nEssa ação não poderá ser desfeita.\n\nDeseja continuar?"
        );


    if (!confirmar) {

        return;

    }


    localStorage.removeItem(
        STORAGE_KEY
    );


    estado =
        criarEstadoInicial();


    salvarDados();


    atualizarDashboard();

    renderUltimasMovimentacoes();

    renderMovimentacoes();

    renderPeriodosArquivados();

    desenharGrafico();


    mostrarToast(
        "Dados apagados",
        "Todos os dados foram removidos deste dispositivo.",
        "✓"
    );

}


/* =====================================================
   TOAST
===================================================== */

let toastTimeout;


function mostrarToast(
    titulo,
    mensagem,
    icone = "✓"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    const toastIcon =
        document.getElementById(
            "toastIcon"
        );


    const toastTitle =
        document.getElementById(
            "toastTitle"
        );


    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    if (!toast) return;


    toastIcon.textContent =
        icone;


    toastTitle.textContent =
        titulo;


    toastMessage.textContent =
        mensagem;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimeout
    );


    toastTimeout =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );

}


/* =====================================================
   FECHAR MODAIS CLICANDO FORA
===================================================== */

document.addEventListener(
    "click",
    function (event) {

        const modalArquivamento =
            document.getElementById(
                "modalArquivamento"
            );


        const modalPeriodo =
            document.getElementById(
                "modalPeriodoArquivado"
            );


        if (
            event.target ===
            modalArquivamento
        ) {

            fecharModalArquivamento();

        }


        if (
            event.target ===
            modalPeriodo
        ) {

            fecharModalPeriodoArquivado();

        }

    }
);


/* =====================================================
   ESC PARA FECHAR MODAIS
===================================================== */

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key !== "Escape"
        ) {

            return;

        }


        fecharModalArquivamento();

        fecharModalPeriodoArquivado();

    }
);


/* =====================================================
   REDESENHAR GRÁFICO AO REDIMENSIONAR
===================================================== */

window.addEventListener(
    "resize",
    function () {

        desenharGrafico();


        if (
            periodoModalAtual
        ) {

            renderGraficoArquivado(
                periodoModalAtual
            );

        }

    }
);