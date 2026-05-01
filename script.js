let dados = [];
let dadosFiltrados = [];
let colunasDisponiveis = [];
let colunaCPF = null;

// 🌙
function toggleDark(){
  document.body.classList.toggle("dark");
}

// 🚀 navegação
function trocarTela(tela){

  document.querySelectorAll(".tela")
    .forEach(t=>{
      t.classList.remove("ativa");
      t.classList.add("hidden");
    });

  const el = document.getElementById("tela_"+tela);
  el.classList.remove("hidden");

  setTimeout(()=> el.classList.add("ativa"),10);
}

window.onload = ()=>{
  trocarTela("crm");
  iniciarPedidos();
};

// 📥 carregar
function carregar(){

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = e=>{
    const wb = XLSX.read(e.target.result,{type:'binary'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(ws,{defval:""});

    colunasDisponiveis = Object.keys(dados[0]);
    detectarCPF();
    preencherSelects();
  };

  reader.readAsBinaryString(file);
}

// 🔍 CPF
function detectarCPF(){
  colunaCPF = colunasDisponiveis.find(c =>
    c.toLowerCase().includes("cpf")
  ) || null;
}

// 🧠 mapear
function preencherSelects(){
  [map_nome,map_tel,map_data,map_valor,map_cidade].forEach(el=>{
    el.innerHTML = colunasDisponiveis.map(c=>`<option>${c}</option>`).join("");
  });
}

// 💰 valor
function limparValor(v){
  return Number(v.toString().replace(/\./g,"").replace(",","."));
}

// 📅 data
function parseDataBR(d){
  if(!d) return null;
  if(typeof d==="number") return new Date((d-25569)*86400000);

  if(d.includes("/")){
    let p=d.split("/");
    return new Date(p[2],p[1]-1,p[0]);
  }

  return new Date(d);
}

// 📞 tel
function formatarTelefone(t){
  let tel=t.toString().replace(/\D/g,"");
  if(!tel.startsWith("55")) tel="55"+tel;
  return tel;
}

// 🌆 cidade
function detectarCidade(txt){

  txt = txt.toLowerCase();

  if(txt.includes("aju")||txt.includes("aracaju")) return "Aracaju";
  if(txt.includes("salvador")||txt.includes("ssa")) return "Salvador";

  return "Outro";
}

// 🧠 classificar
function classificar(c){

  const dias = (new Date() - c.ultimaCompra)/86400000;

  if(c.total>=1000) return "VIP";
  if(c.quantidade>=5) return "Frequente";
  if(dias>30) return "Inativo";

  return "Novo";
}

// 🚀 processar
function processar(){

  let mapa={};

  dados.forEach(l=>{

    const nome=l[map_nome.value];
    if(!nome) return;

    const data=parseDataBR(l[map_data.value]);
    const valor=limparValor(l[map_valor.value]);

    if(!data) return;

    // filtro data
    if(data_inicio.value && data < new Date(data_inicio.value)) return;
    if(data_fim.value && data > new Date(data_fim.value)) return;

    const cidade=detectarCidade(l[map_cidade.value]);

    if(cidade==="Aracaju" && !cidade_aracaju.checked) return;
    if(cidade==="Salvador" && !cidade_salvador.checked) return;

    if(!mapa[nome]){
      mapa[nome]={
        nome,
        telefone:formatarTelefone(l[map_tel.value]),
        total:0,
        quantidade:0,
        ultimaCompra:data,
        cidade
      };
    }

    mapa[nome].total+=valor;
    mapa[nome].quantidade++;

    if(data>mapa[nome].ultimaCompra){
      mapa[nome].ultimaCompra=data;
    }
  });

  dadosFiltrados = Object.values(mapa).map(c=>{
    c.classificacao = classificar(c);
    return c;
  });

  gerarPreview();
}

// 👀 preview
function gerarPreview(){

  let html="<table><tr><th>Nome</th><th>Total</th><th>Cidade</th><th>Classificação</th></tr>";

  dadosFiltrados.forEach(c=>{
    html+=`
    <tr>
      <td>${c.nome}</td>
      <td>${c.total.toFixed(2)}</td>
      <td>${c.cidade}</td>
      <td>${c.classificacao}</td>
    </tr>`;
  });

  html+="</table>";

  preview.innerHTML=html;
}

// 📤 export
function baixarPlanilha(){
  const ws = XLSX.utils.json_to_sheet(dadosFiltrados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Clientes");
  XLSX.writeFile(wb,"clientes.xlsx");
}

// ================= 🍱 PEDIDOS =================

async function criarPedidoUI(){

  await window.fb.addDoc(
    window.fb.collection(window.db,"pedidos"),
    {
      cliente:pedido_nome.value,
      telefone:formatarTelefone(pedido_tel.value),
      quantidade:Number(pedido_qtd.value),
      status:"pendente",
      horaPedido:new Date().toISOString(),
      horaLimite:new Date(Date.now()+40*60000).toISOString()
    }
  );
}

function iniciarPedidos(){

  window.fb.onSnapshot(
    window.fb.collection(window.db,"pedidos"),
    snap=>{
      let lista=[];
      snap.forEach(doc=>{
        lista.push({id:doc.id,...doc.data()});
      });
      renderPedidos(lista);
    }
  );
}

function renderPedidos(lista){

  col_pendente.innerHTML="";
  col_preparando.innerHTML="";
  col_pronto.innerHTML="";
  col_atrasado.innerHTML="";

  lista.forEach(p=>{

    const el=document.createElement("div");
    el.className="pedido-item "+p.status;

    el.innerHTML=`
      <strong>${p.cliente}</strong><br>
      ${p.quantidade} marmitas<br>
      <button onclick="atualizarStatusPedido('${p.id}','preparando')">→</button>
      <button onclick="atualizarStatusPedido('${p.id}','pronto')">✓</button>
    `;

    if(p.status==="pendente") col_pendente.appendChild(el);
    else if(p.status==="preparando") col_preparando.appendChild(el);
    else if(p.status==="pronto") col_pronto.appendChild(el);
    else col_atrasado.appendChild(el);
  });
}

async function atualizarStatusPedido(id,status){
  await window.fb.updateDoc(window.fb.doc(window.db,"pedidos",id),{status});
}

// ================= 🤖 IA =================

async function gerarMensagem(){

  respostaIA.innerHTML="Gerando...";

  const res = await fetch("/api/ia",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt:promptIA.value})
  });

  const data = await res.json();

  respostaIA.innerHTML=data.texto || "Erro";
}
