let dados = [];
let dadosFiltrados = [];
let colunasDisponiveis = [];
let colunaCPF = null;
let filtroAtual = "Todos";

// 🌙 DARK MODE
function toggleDark(){
  document.body.classList.toggle("dark");
  localStorage.setItem("tema", document.body.classList.contains("dark") ? "dark":"light");
}

window.onload = () => {
  if(localStorage.getItem("tema")==="dark"){
    document.body.classList.add("dark");
  }
};

// 🔘 TOGGLE BOX
function toggle(id){
  document.getElementById(id).classList.toggle("hidden");
}

// 📥 CARREGAR PLANILHA
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

    console.log("Colunas:", colunasDisponiveis);
  };

  reader.readAsBinaryString(file);
}

// 🔍 DETECTAR CPF
function detectarCPF(){
  const termos = ["cpf","documento","doc","id"];
  colunaCPF = colunasDisponiveis.find(c =>
    termos.some(t => c.toLowerCase().includes(t))
  ) || null;

  console.log("CPF detectado:", colunaCPF);
}

// 🧠 AUTO MAPEAR
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

// 💰 VALOR
function limparValor(v){
  return Number(
    v.toString().replace(/\./g,"").replace(",",".")
  ) || 0;
}

// 📅 DATA ROBUSTA
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

// 📞 TELEFONE
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

// 🌆 DETECÇÃO DE CIDADE (ROBUSTA)
function detectarCidade(txt){

  if(!txt) return "Outro";

  txt = txt.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ");

  // 🔥 BAIRROS DE ARACAJU
  const bairrosAracaju = [
    "atalaia","farolandia","grageru","13 de julho","jardins",
    "siqueira campos","bugio","santos dumont","aeroporto",
    "industrial","centro"
  ];

  // 🔥 BAIRROS DE SALVADOR
  const bairrosSalvador = [
    "pituba","barra","ondina","rio vermelho","itapua",
    "cajazeiras","periperi","liberdade","cabula"
  ];

  // 🔥 ARACAJU
  if(
    txt.includes("aracaju") ||
    txt.includes("aju") ||
    txt.includes("sergipe") ||
    txt.includes(" se") ||
    bairrosAracaju.some(b => txt.includes(b))
  ){
    return "Aracaju";
  }

  // 🔥 SALVADOR
  if(
    txt.includes("salvador") ||
    txt.includes("ssa") ||
    txt.includes("bahia") ||
    txt.includes(" ba") ||
    bairrosSalvador.some(b => txt.includes(b))
  ){
    return "Salvador";
  }

  return "Outro";
}
// 🧠 CLASSIFICAÇÃO
function classificar(c){

  const hoje = new Date();
  const dias = (hoje - c.ultimaCompra) / 86400000;

  if(c.total >= cfg_vip_valor.value || c.quantidade >= cfg_vip_qtd.value) return "VIP";
  if(c.quantidade >= cfg_freq_qtd.value) return "Frequente";
  if(dias > cfg_risco_min.value && dias <= cfg_risco_max.value) return "Em risco";
  if(dias > cfg_inativo.value) return "Inativo";

  return "Novo";
}

// 🚀 PROCESSAR
function processar(){

  if(!dados.length){
    alert("Carregue a planilha primeiro");
    return;
  }

  let mapa = {};

  dados.forEach(linha=>{

    const nome = linha[map_nome.value];
    if(!nome) return;

    const data = parseDataBR(linha[map_data.value]);
    const valor = limparValor(linha[map_valor.value]);

    if(!data) return;

    // 📅 FILTRO DATA
    if(data_inicio.value && data < new Date(data_inicio.value)) return;
    if(data_fim.value && data > new Date(data_fim.value)) return;

    const cidade = detectarCidade(linha[map_cidade.value]);

    // 🌆 FILTRO CORRIGIDO
    if(cidade === "Aracaju" && !cidade_aracaju.checked) return;
    if(cidade === "Salvador" && !cidade_salvador.checked) return;

    if(!mapa[nome]){
      mapa[nome] = {
        nome,
        telefone: formatarTelefone(linha[map_tel.value]),
        total: 0,
        quantidade: 0,
        ultimaCompra: data,
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

  salvarTodasVendas();
}

// 🔥 FIREBASE BACKGROUND
async function salvarTodasVendas(){

  for(let linha of dados){

    const nome = linha[map_nome.value];
    if(!nome) continue;

    const cpf = colunaCPF ? linha[colunaCPF] : "sem_cpf";

    const data = parseDataBR(linha[map_data.value]);
    const valor = limparValor(linha[map_valor.value]);

    if(!data) continue;

    const telefone = formatarTelefone(linha[map_tel.value]);
    const cidade = detectarCidade(linha[map_cidade.value]);

    const id = cpf + "_" + data.toISOString() + "_" + valor;

    try{

      const q = window.fb.query(
        window.fb.collection(window.db,"vendas"),
        window.fb.where("id","==",id)
      );

      const snap = await window.fb.getDocs(q);

      if(snap.empty){
        await window.fb.addDoc(
          window.fb.collection(window.db,"vendas"),
          {
            id, cpf, nome, telefone, valor,
            data: data.toISOString(),
            cidade
          }
        );
      }

    }catch(e){
      console.log("Erro Firebase:", e);
    }
  }

  console.log("✅ Firebase atualizado");
}

// 🎯 FILTRO UX
function filtrarTipo(tipo,el){

  filtroAtual = tipo;

  document.querySelectorAll(".filtro-btn")
    .forEach(b => b.classList.remove("active"));

  el.classList.add("active");

  gerarPreview();
}

// 📊 RESUMO
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
    <div class="card"><h4>Clientes</h4><span>${total}</span></div>
    <div class="card"><h4>Faturamento</h4><span>R$ ${faturamento.toFixed(2)}</span></div>
    <div class="card"><h4>VIP</h4><span>${vip}</span></div>
    <div class="card"><h4>Em risco</h4><span>${risco}</span></div>
  `;
}

// 👀 PREVIEW
function gerarPreview(){

  gerarResumo();

  let lista = filtroAtual === "Todos"
    ? dadosFiltrados
    : dadosFiltrados.filter(c => c.classificacao === filtroAtual);

  let html = "<table><tr><th>Nome</th><th>Telefone</th><th>Total</th><th>Cidade</th><th>Classificação</th></tr>";

  lista.forEach(c=>{

    let classe = "";

    if(c.classificacao === "VIP") classe="vip";
    if(c.classificacao === "Frequente") classe="freq";
    if(c.classificacao === "Em risco") classe="risco";
    if(c.classificacao === "Inativo") classe="inativo";

    html += `<tr class="${classe}">
      <td>${c.nome}</td>
      <td>${c.telefone}</td>
      <td>${c.total.toFixed(2)}</td>
      <td>${c.cidade}</td>
      <td>${c.classificacao}</td>
    </tr>`;
  });

  html += "</table>";

  preview.innerHTML = html;
}

// 📤 EXPORTAR
function baixarPlanilha(){

  if(!dadosFiltrados.length){
    alert("Nada para exportar");
    return;
  }

  let dadosExport = dadosFiltrados.map(c=>({
    Nome: c.nome,
    Telefone: c.telefone,
    Total: c.total.toFixed(2),
    Cidade: c.cidade,
    Data: c.ultimaCompra.toLocaleDateString(),
    Classificação: c.classificacao
  }));

  const ws = XLSX.utils.json_to_sheet(dadosExport);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Clientes");
  XLSX.writeFile(wb, "clientes_filtrados.xlsx");
}