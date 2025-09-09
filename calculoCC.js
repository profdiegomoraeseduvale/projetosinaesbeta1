const pesos = { dim1: 30, dim2: 40, dim3: 30 };

function calcularMediaDimensao(nomeDimensao) {
  const inputs = document.querySelectorAll(`input[name^="${nomeDimensao}_"]:checked`);
  let total = 0;
  let count = 0;
  inputs.forEach(input => {
    if (input.value.toLowerCase() !== 'nsa') {
      total += parseInt(input.value);
      count++;
    }
  });
  return count > 0 ? total / count : 0;
}

function atualizarNomeAba(dimensao, media) {
  const aba = document.querySelector(`#${dimensao}-tab`);
  aba.innerText = aba.innerText.split(' - ')[0] + ` - ${media.toFixed(2)}`;
}

function calcularCC() {
  const medias = {
    dim1: calcularMediaDimensao('d1'),
    dim2: calcularMediaDimensao('d2'),
    dim3: calcularMediaDimensao('d3')
  };

  atualizarNomeAba('dim1', medias.dim1);
  atualizarNomeAba('dim2', medias.dim2);
  atualizarNomeAba('dim3', medias.dim3);

  const cc = ((medias.dim1 * pesos.dim1) + (medias.dim2 * pesos.dim2) + (medias.dim3 * pesos.dim3)) / 100;

  exibirResultados(medias, cc);
}

function exibirResultados(medias, cc) {
  const container = document.getElementById('resultadosContainer');
  container.innerHTML = `
    <h3>Nota Geral do Curso (CC): <strong>${cc.toFixed(2)}</strong></h3>
    <h4>Notas por Dimensão:</h4>
    <ul>
      <li>Dimensão 1: ${medias.dim1.toFixed(2)}</li>
      <li>Dimensão 2: ${medias.dim2.toFixed(2)}</li>
      <li>Dimensão 3: ${medias.dim3.toFixed(2)}</li>
    </ul>
    <canvas id="graficoIndicadores" height="120"></canvas>
    <div id="indicadoresCriticos"></div>
  `;
  desenharGraficoIndicadores();
  listarCriticos();
}

function desenharGraficoIndicadores() {
  const labels = []; // Lista de códigos dos indicadores (ex: "Indicador 1.1")
  const data = [];
  const cores = [];
  const descricoesCompletas = [];

  const inputs = document.querySelectorAll('input[type="radio"]:checked');
  inputs.forEach(input => {
    if (input.value.toLowerCase() !== 'nsa') {
      const card = input.closest('tr')
        .parentElement.parentElement
        .closest('.card');

      const indicadorCompleto = card.querySelector('button').innerText.trim();
      const titulo = indicadorCompleto.split(' - ')[0].trim();

      labels.push(titulo);
      descricoesCompletas.push(indicadorCompleto);

      const valor = parseInt(input.value);
      data.push(valor);
      cores.push(valor < 3 ? '#dc3545' : '#007bff');
    }
  });

  const ctx = document.getElementById('graficoIndicadores').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Nota por Indicador',
        data: data,
        backgroundColor: cores
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function(context) {
              const index = context[0].dataIndex;
              return descricoesCompletas[index];
            },
            label: function(context) {
              return `Nota: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
          title: {
            display: true,
            text: 'Nota'
          }
        },
        x: {
          ticks: {
            display: false // ❌ Oculta os rótulos dos indicadores
          },
          title: {
            display: true,
            text: 'Indicadores' // ✅ Exibe apenas o título do eixo
          }
        }
      }
    }
  });
}

function listarCriticos() {
  const todos = Array.from(document.querySelectorAll('input[type="radio"]:checked'))
                     .filter(input => !isNaN(parseInt(input.value)));
  const criticos = todos.filter(input => parseInt(input.value) < 3);

  const div = document.getElementById('indicadoresCriticos');
  div.innerHTML = '';

  const titulo = document.createElement('h5');
  titulo.textContent = 'Indicadores com nota inferior a 3 (Análise de Sensibilidade):';
  div.appendChild(titulo);

  if (criticos.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Nenhum indicador crítico.';
    div.appendChild(p);
    return;
  }

  const counts = { dim1: 0, dim2: 0, dim3: 0 };
  todos.forEach(input => {
    if (input.name.startsWith("d1_")) counts.dim1++;
    else if (input.name.startsWith("d2_")) counts.dim2++;
    else if (input.name.startsWith("d3_")) counts.dim3++;
  });

  const listaCriticos = criticos.map(input => {
    const indicador = input.closest('tr')
      .parentElement.parentElement
      .closest('.card')
      .querySelector('button').innerText.trim();

    let dim = input.name.startsWith("d1_") ? "dim1" :
              input.name.startsWith("d2_") ? "dim2" :
              "dim3";

    const countDim = counts[dim] || 1;
    const sensibilidade = parseFloat((pesos[dim] / countDim).toFixed(2));

    return {
      indicador,
      nota: parseInt(input.value),
      sensibilidade
    };
  });

  listaCriticos.sort((a, b) => b.sensibilidade - a.sensibilidade);

  const maxSens = Math.max(...listaCriticos.map(i => i.sensibilidade));
  const minSens = Math.min(...listaCriticos.map(i => i.sensibilidade));

  const table = document.createElement('table');
  table.className = 'table table-bordered table-striped table-hover table-sm mt-2';
  table.style.tableLayout = 'fixed'; // largura fixa das colunas

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr class="table-danger text-center">
      <th style="width: 50%; text-align:center; vertical-align:middle;">Indicador</th>
      <th style="width: 25%; text-align:center; vertical-align:middle;">Nota</th>
      <th style="width: 25%; text-align:center; vertical-align:middle;">Sensibilidade no CC (%)</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  listaCriticos.forEach(item => {
    let intensidade = (item.sensibilidade - minSens) / (maxSens - minSens || 1);
    let cor = `rgba(220, 53, 69, ${0.3 + intensidade * 0.7})`;

    let indicadorDisplay = item.indicador;
    if (item.sensibilidade >= 8) {
      indicadorDisplay = `⚠️ ${indicadorDisplay}`;
    }

    const tr = document.createElement('tr');

    // Célula Indicador
    const tdIndicador = document.createElement('td');
    tdIndicador.textContent = indicadorDisplay;
    tdIndicador.style.textAlign = 'left';
    tdIndicador.style.verticalAlign = 'middle';

    // Célula Nota
    const tdNota = document.createElement('td');
    tdNota.textContent = item.nota;
    tdNota.style.textAlign = 'center';
    tdNota.style.verticalAlign = 'middle';

    // Célula Sensibilidade
    const tdSensibilidade = document.createElement('td');
    tdSensibilidade.textContent = item.sensibilidade.toFixed(2) + '%';
    tdSensibilidade.style.textAlign = 'center';
    tdSensibilidade.style.verticalAlign = 'middle';
    tdSensibilidade.style.backgroundColor = cor;

    // Adicionar células à linha
    tr.appendChild(tdIndicador);
    tr.appendChild(tdNota);
    tr.appendChild(tdSensibilidade);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  div.appendChild(table);
}

function salvarDados() {
  const selecionados = document.querySelectorAll('input[type="radio"]:checked');
  const dados = {
    nomeIes: document.getElementById('nomeIes').value,
    nomeCurso: document.getElementById('nomeCurso').value,
    respostas: Array.from(selecionados).map(input => ({
      name: input.name,
      value: input.value
    }))
  };

  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `avaliacao_${dados.nomeCurso || 'curso'}.json`;
  a.click();
}

function carregarDados(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const dados = JSON.parse(e.target.result);

    document.getElementById('nomeIes').value = dados.nomeIes || '';
    document.getElementById('nomeCurso').value = dados.nomeCurso || '';

    dados.respostas.forEach(item => {
      const input = document.querySelector(`input[name="${item.name}"][value="${item.value}"]`);
      if (input) input.checked = true;
    });

    Toastify({
      text: "✅ Dados carregados com sucesso!",
      duration: 4000,
      gravity: "top", // ou "bottom"
      position: "right", // ou "left", "center"
      backgroundColor: "#28a745", // verde Bootstrap
      stopOnFocus: true
    }).showToast();
  };

  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {


  const abaResultados = document.createElement('div');
  abaResultados.className = 'tab-pane fade';
  abaResultados.id = 'resultados';
  abaResultados.innerHTML = '<div class="mt-3" id="resultadosContainer"></div>';
  document.getElementById('tabContent').appendChild(abaResultados);

  const liResultados = document.createElement('li');
  liResultados.className = 'nav-item';
  liResultados.innerHTML = '<button class="nav-link" id="resultados-tab" data-bs-toggle="tab" data-bs-target="#resultados" type="button" role="tab">Resultados</button>';
  document.getElementById('tabMenu').appendChild(liResultados);
});