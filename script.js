let dados = [];
let dadosFiltrados = [];
let colunasDisponiveis = [];
let filtroAtual = "Todos";

function toggleDark(){
  document.body.classList.toggle("dark");
}

function carregar(){
  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = e=>{
    const wb = XLSX.read(e.target.result,{type:'binary'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(ws,{defval:""});

    colunasDisponiveis = Object.keys(dados[0]);

    preencherSelects();
  };

  reader.readAsBinaryString(file);
}

function preencherSelects(){
  [map_nome,map_tel,map_data,map_valor,map_cidade].forEach(el=>{
    el.innerHTML = colunasDisponiveis.map(c=>`<option>${c}</option>`).join("");
  });
}

function limparValor(v){
  return Number(v.toString().replace(/\./g,"").replace(",","."));
}

function parseDataBR(d){
  if(typeof d==="number") return new Date((d-25569)*86400000);
  return new Date(d);
}

function detectarCidade(txt){
  txt = txt.toLowerCase();
  if(txt.includes("aju")) return "Aracaju";
  if(txt.includes("ssa") || txt.includes("salvador")) return "Salvador";
  return "Outro";
}

function classificar(c){
  const dias = (new Date() - c.ultimaCompra)/86400000;

  if(c.total >= cfg_vip_valor.value) return "VIP";
  if(c.quantidade >= cfg_freq_qtd.value) return "Frequente";
  if(dias > cfg_risco_min.value && dias <= cfg_risco_max.value) return "Em risco";
  if(dias > cfg_inativo.value) return "Inativo";

  return "Novo";
}

function processar(){

  let mapa = {};

  dados.forEach(l=>{

    const nome = l[map_nome.value];
    if(!nome) return;

    const data = parseDataBR(l[map_data.value]);
    const valor = limparValor(l[map_valor.value]);

    const cidade = detectarCidade(l[map_cidade.value]);

    if(!mapa[nome]){
      mapa[nome] = {
        nome,
        total:0,
        quantidade:0,
        ultimaCompra:data,
        cidade
      };
    }

    mapa[nome].total += valor;
    mapa[nome].quantidade++;
  });

  dadosFiltrados = Object.values(mapa).map(c=>{
    c.classificacao = classificar(c);
    return c;
  });

  gerarPreview();
}

function gerarResumo(){

  let total = dadosFiltrados.length;
  let faturamento = dadosFiltrados.reduce((a,c)=>a+c.total,0);

  resumo.innerHTML = `
    <div class="cardResumo">${total} Clientes</div>
    <div class="cardResumo">R$ ${faturamento.toFixed(2)}</div>
  `;
}

function setFiltro(tipo,el){
  filtroAtual = tipo;

  document.querySelectorAll(".filtros button")
    .forEach(b => b.classList.remove("active"));

  el.classList.add("active");

  gerarPreview();
}

function gerarPreview(){

  gerarResumo();

  let lista = filtroAtual==="Todos"
    ? dadosFiltrados
    : dadosFiltrados.filter(c=>c.classificacao===filtroAtual);

  let html="<table>";

  lista.forEach(c=>{
    html+=`<tr class="${c.classificacao.toLowerCase()}">
      <td>${c.nome}</td>
      <td>${c.total.toFixed(2)}</td>
      <td>${c.cidade}</td>
      <td>${c.classificacao}</td>
    </tr>`;
  });

  html+="</table>";

  preview.innerHTML=html;
}
