// =============================
// BASE ORIGINAL (MANTIDA)
// =============================

let dados = [];
let dadosFiltrados = [];
let colunasDisponiveis = [];
let colunaCPF = null;
let filtroAtual = "Todos";

// 🌙 DARK MODE
function toggleDark(){
  document.body.classList.toggle("dark");
}

// 🔘 TOGGLE BOX
function toggle(id){
  document.getElementById(id).classList.toggle("hidden");
}

// =============================
// 📥 CARREGAR PLANILHA (ORIGINAL)
// =============================
function carregar(){

  const file = fileInput.files[0];
  if(!file) return alert("Selecione um arquivo");

  const reader = new FileReader();

  reader.onload = e => {

    const wb = XLSX.read(e.target.result,{type:'binary'});
    const ws = wb.Sheets[wb.SheetNames[0]];

    dados = XLSX.utils.sheet_to_json(ws,{defval:""});

    if(dados.length === 0){
      alert("Erro ao ler planilha");
      return;
    }

    colunasDisponiveis = Object.keys(dados[0]);

    detectarCPF();
    preencherSelects();

    btnProcessar.disabled = false;
  };

  reader.readAsBinaryString(file);
}

// 🔍 CPF (MANTIDO)
function detectarCPF(){
  const termos = ["cpf","documento","doc","id"];
  colunaCPF = colunasDisponiveis.find(c =>
    termos.some(t => c.toLowerCase().includes(t))
  ) || null;
}

// 🧠 AUTO MAPEAR (MANTIDO)
function preencherSelects(){

  function auto(termos){
    return colunasDisponiveis.find(c =>
      termos.some(t => c.toLowerCase().includes(t))
    ) || colunasDisponiveis[0];
  }

  [map_nome,map_tel,map_data,map_valor,map_cidade].forEach(el=>{
    el.innerHTML = colunasDisponiveis.map(c=>`<option>${c}</option>`).join("");
  });

  map_nome.value = auto(["nome"]);
  map_tel.value = auto(["fone","tel","whatsapp"]);
  map_data.value = auto(["data"]);
  map_valor.value = auto(["valor","total"]);
  map_cidade.value = auto(["endereco","cidade","bairro"]);
}

// =============================
// 💰 VALOR (ROBUSTO)
// =============================
function limparValor(v){
  return Number(
    v.toString().replace(/\./g,"").replace(",",".")
  ) || 0;
}

// =============================
// 📅 DATA (ROBUSTA)
// =============================
function parseDataBR(d){

  if(!d) return null;

  if(typeof d === "number"){
    return new Date((d - 25569) * 86400000);
  }

  if(typeof d === "string"){

    if(d.includes("/")){
      let p = d.split("/");
      return new Date(p[2], p[1]-1, p[0]);
    }

    if(d.includes("-")){
      let dt = new Date(d);
      if(!isNaN(dt)) return dt;
    }

    let dt = new Date(d);
    if(!isNaN(dt)) return dt;
  }

  return null;
}

// =============================
// 📞 TELEFONE (ROBUSTO)
// =============================
function formatarTelefone(t){

  let tel = t.toString().replace(/\D/g,"");

  if(tel.startsWith("55")) return tel;

  if(tel.length === 11 || tel.length === 10){
    return "55"+tel;
  }

  if(tel.length >= 8 && tel.length <= 9){
    return "5571"+tel;
  }

  return tel;
}

// =============================
// 🌆 CIDADE (COMPLETA)
// =============================
function detectarCidade(txt){

  if(!txt) return "Outro";

  txt = txt.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ");

  const bairrosAracaju = ["atalaia","farolandia","grageru","jardins"];
  const bairrosSalvador = ["pituba","barra","ondina","itapua"];

  if(txt.includes("aracaju") || txt.includes("aju") || bairrosAracaju.some(b => txt.includes(b))){
    return "Aracaju";
  }

  if(txt.includes("salvador") || txt.includes("ssa") || bairrosSalvador.some(b => txt.includes(b))){
    return "Salvador";
  }

  return "Outro";
}

// =============================
// 🧠 CLASSIFICAÇÃO COMPLETA (NOVO)
// =============================
function classificar(c){

  const hoje = new Date();
  const dias = (hoje - c.ultimaCompra) / 86400000;

  const vipValor = Number(cfg_vip_valor.value);
  const vipQtd = Number(cfg_vip_qtd.value);
  const freqQtd = Number(cfg_freq_qtd.value);
  const riscoMin = Number(cfg_risco_min.value);
  const riscoMax = Number(cfg_risco_max.value);
  const inativo = Number(cfg_inativo.value);

  if(c.total >= vipValor || c.quantidade >= vipQtd) return "VIP";
  if(c.quantidade >= freqQtd) return "Frequente";
  if(dias > riscoMin && dias <= riscoMax) return "Em risco";
  if(dias > inativo) return "Inativo";

  return "Novo";
}

// =============================
// 🚀 PROCESSAR (ORIGINAL + MELHORADO)
// =============================
function processar(){

  let mapa = {};

  dados.forEach(l=>{

    const nome = l[map_nome.value];
    if(!nome) return;

    const data = parseDataBR(l[map_data.value]);
    const valor = limparValor(l[map_valor.value]);

    if(!data) return;

    const cidade = detectarCidade(l[map_cidade.value]);

    if(cidade==="Aracaju" && !cidade_aracaju.checked) return;
    if(cidade==="Salvador" && !cidade_salvador.checked) return;

    if(!mapa[nome]){
      mapa[nome] = {
        nome,
        telefone: formatarTelefone(l[map_tel.value]),
        total:0,
        quantidade:0,
        ultimaCompra:data,
        cidade
      };
    }

    mapa[nome].total += valor;
    mapa[nome].quantidade++;

    if(data > mapa[nome].ultimaCompra){
      mapa[nome].ultimaCompra = data;
    }

  });

  dadosFiltrados = Object.values(mapa).map(c=>{
    c.classificacao = classificar(c);
    return c;
  });

  gerarPreview();
}

// =============================
// 📊 RESUMO (NOVO)
// =============================
function gerarResumo(){

  let total = dadosFiltrados.length;
  let faturamento = 0;
  let vip = 0;
  let risco = 0;

  dadosFiltrados.forEach(c=>{
    faturamento += c.total;
    if(c.classificacao === "VIP") vip++;
    if(c.classificacao === "Em risco") risco++;
  });

  resumo.innerHTML = `
    <div class="cardResumo"><span>Clientes</span><strong>${total}</strong></div>
    <div class="cardResumo"><span>Faturamento</span><strong>R$ ${faturamento.toFixed(2)}</strong></div>
    <div class="cardResumo"><span>VIP</span><strong>${vip}</strong></div>
    <div class="cardResumo"><span>Em risco</span><strong>${risco}</strong></div>
  `;
}

// =============================
// 🎯 FILTRO POR BOTÃO (NOVO)
// =============================
function setFiltro(tipo, el){

  filtroAtual = tipo;

  document.querySelectorAll(".filtros-tipo button")
    .forEach(b => b.classList.remove("active"));

  el.classList.add("active");

  gerarPreview();
}

// =============================
// 👀 PREVIEW (MELHORADO)
// =============================
function gerarPreview(){

  gerarResumo();

  let lista = filtroAtual === "Todos"
    ? dadosFiltrados
    : dadosFiltrados.filter(c => c.classificacao === filtroAtual);

  let html = "<table><tr><th>Nome</th><th>Total</th><th>Cidade</th><th>Classificação</th></tr>";

  lista.forEach(c=>{

    let classe = "";

    if(c.classificacao === "VIP") classe="vip";
    if(c.classificacao === "Frequente") classe="freq";
    if(c.classificacao === "Em risco") classe="risco";
    if(c.classificacao === "Inativo") classe="inativo";

    html += `
    <tr class="${classe}">
      <td>${c.nome}</td>
      <td>${c.total.toFixed(2)}</td>
      <td>${c.cidade}</td>
      <td>${c.classificacao}</td>
    </tr>`;
  });

  html += "</table>";

  preview.innerHTML = html;
}
