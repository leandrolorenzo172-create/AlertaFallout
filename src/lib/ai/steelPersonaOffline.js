// Persona do Mr. Steel para o modo offline (e sem chave de IA): frases com variação, em português de Portugal.
// Inspirado no J.A.R.V.I.S.: elegante, calmo, analítico, com um toque subtil de ironia.
// Cada lista tem pelo menos 20 variações; pick() nunca repete a última frase usada dessa lista.

const LAST = new Map();
export function pick(key, list) {
  if (!list || !list.length) return '';
  if (list.length === 1) return list[0];
  const prev = LAST.get(key);
  let i = Math.floor(Math.random() * list.length);
  if (i === prev) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  LAST.set(key, i);
  return list[i];
}

// ---------- 1. Saudações: 4 por período do dia + 4 para o modo offline (20) ----------
export const GREETINGS = {
  manha: [
    'Bom dia. Sistemas operacionais e dados do IPMA sincronizados. Qual é a diretiva?',
    'Bom dia. Boletins matinais processados. O mundo continua imprevisível, mas os nossos protocolos estão em ordem.',
    'Muito bom dia. Tudo estável no perímetro. Por onde começamos?',
    'Bom dia. Indicadores atualizados e o café, presumo, a caminho. Aguardo as suas instruções.',
  ],
  tarde: [
    'Boa tarde. Sistemas estáveis e Manual pronto. O que precisa de analisar?',
    'Boa tarde. A monitorização de alertas e greves segue em segundo plano. Diga-me o que pretende.',
    'Boa tarde. Base de conhecimento operacional. Qual é a prioridade desta tarde?',
    'Boa tarde. Se o dia trouxe algum imprevisto, estou aqui para estruturar a solução.',
  ],
  noite: [
    'Boa noite. Os meus algoritmos não precisam de descanso. Em que posso ser útil?',
    'Boa noite. Registos do dia consolidados. Precisa de rever algum protocolo antes de recolher?',
    'Boa noite. Sistemas em vigília e prontos para consultar os seus ficheiros.',
    'Boa noite. Terminal operacional. Diga-me a questão e eu trato dos detalhes.',
  ],
  madrugada: [
    'Hora pouco convencional, mas estou inteiramente ao dispor. Alguma emergência?',
    'Ainda por aí? Os sistemas da SteelDeck continuam de sentinela. O que o traz ao terminal?',
    'O silêncio da madrugada favorece a análise fria dos factos. O que precisa de verificar?',
    'Saudações noturnas. Manual pronto. Espero que seja apenas curiosidade e não um imprevisto.',
  ],
  offline: [
    'Sem rede, sem alarme. Opero em modo autónomo com o Guia e os seus ficheiros locais.',
    'Estamos offline. As redes exteriores caíram, mas a minha base de dados local permanece intacta.',
    'Modo autónomo ativo. Tenho os 18 módulos do Guia prontos para consulta.',
    'Sem internet detetada. Felizmente, a SteelDeck foi desenhada exatamente para este cenário.',
  ],
};
export const periodOf = (d = new Date()) => {
  const h = d.getHours();
  return h < 6 ? 'madrugada' : h < 12 ? 'manha' : h < 20 ? 'tarde' : 'noite';
};
export function greeting(offline = false) {
  return offline ? pick('g-off', GREETINGS.offline) : pick(`g-${periodOf()}`, GREETINGS[periodOf()]);
}

// ---------- 2. Começar conversa / convites à ação (20) ----------
export const STARTERS = [
  'Diga-me o que pretende analisar ou redigir.',
  'Estou pronto. Qual é o cenário ou o documento a rever?',
  'Aguardo instruções. Verificamos avisos ou consultamos o Guia?',
  'Se tiver ficheiros carregados para dissecar, este é o momento.',
  'Qual é o objetivo: preparação logística, consulta técnica ou escrita?',
  'Coloque o problema. Eu filtro o ruído e entrego os factos.',
  'Indique o contexto e eu localizo as diretrizes exatas.',
  'A planear uma saída para a montanha? Posso verificar os parâmetros necessários.',
  'Tenho os 18 módulos do Guia indexados. Sobre que tema quer uma síntese?',
  'Partilhe notas dispersas e eu transformo-as num plano.',
  'Estou à escuta. Que variável resolvemos primeiro?',
  'Posso redigir textos ou esclarecer primeiros socorros. O que prefere?',
  'Apresente a dúvida. Farei o cruzamento das fontes locais.',
  'Sistemas calibrados. Pesquisa técnica ou análise de um caso prático?',
  'Quando estiver pronto, avance. Manterei a análise objetiva e livre de dramatismos.',
  'Se houver falhas nos seus planos, eu deteto-as. Por onde começamos?',
  'Diga-me o que tem em mãos e encontramos a solução mais eficiente.',
  'Exploramos os protocolos de emergência ou os seus próprios ficheiros?',
  'Formule a pergunta. Eu trato de localizar as referências.',
  'A consola é sua. Indique a tarefa.',
];
export const starter = () => pick('start', STARTERS);

// ---------- 3. Introduzir / estruturar respostas (20) ----------
export const INTROS = [
  'Analisei os registos. Os pontos essenciais são estes:',
  'Com base nos dados locais, eis a abordagem mais prudente:',
  'Permita-me estruturar a resposta por prioridade:',
  'Os documentos apontam para uma conclusão clara:',
  'Para evitar ambiguidades, eis o que consta nos registos:',
  'Segundo a documentação disponível, eis o procedimento:',
  'Fiz a triagem aos ficheiros. Os parâmetros críticos são estes:',
  'Comecemos pelos factos verificados:',
  'Reduzi a informação ao essencial para uma decisão rápida:',
  'Eis a síntese do que encontrei:',
  'Consultei os módulos correspondentes e compilei o seguinte:',
  'Para não escapar nada, aqui está o essencial, por ordem:',
  'A base de conhecimento é bastante concreta neste ponto:',
  'Atendendo às variáveis, eis o que os registos indicam:',
  'Extraí os dados pertinentes. O panorama é este:',
  'Vamos por partes, começando pelo que tem maior impacto:',
  'A documentação técnica é específica quanto a isto. Ora veja:',
  'Preparei um resumo para leitura rápida no terreno:',
  'Cruzei a pergunta com as fontes locais. O resultado é este:',
  'Sem rodeios, estes são os elementos fundamentais:',
];
export const intro = () => pick('intro', INTROS);

// ---------- 4. Conectores de raciocínio e cruzamento de fontes (20) ----------
export const CONNECTORS = [
  'Cruzando esta diretriz com outra fonte, vê-se o seguinte:',
  'Isto ganha relevância quando articulado com outro registo:',
  'Confrontando com outra secção da base de conhecimento:',
  'Ligando à recomendação anterior, a documentação acrescenta:',
  'Há uma correlação clara com outra fonte:',
  'Seguindo esta linha, convém atender ao que consta noutro capítulo:',
  'Este passo não atua isolado; complementa-se com isto:',
  'Sobrepondo ambos os registos, nota-se uma complementaridade:',
  'Outra passagem corrobora e reforça o ponto anterior:',
  'Aplicando a mesma lógica a outra fonte, conclui-se o seguinte:',
  'Convém ressalvar, porém, o que outra secção indica:',
  'Esta premissa ajuda a explicar o que surge noutro registo:',
  'A articulação com outro excerto preenche uma lacuna:',
  'Uma segunda fonte acrescenta uma variável decisiva:',
  'Consolidando com outra passagem, o quadro completa-se:',
  'Este detalhe técnico justifica a precaução descrita aqui:',
  'Ligando os pontos com outra referência, percebe-se o seguinte:',
  'A coerência com outro documento aponta na mesma direção:',
  'Considerando também outra fonte local:',
  'Em complemento, a interseção com outra referência mostra:',
];
export const connector = () => pick('conn', CONNECTORS);

// ---------- 5. Ausência de dados offline (20) — {t} = temas que existem na base ----------
export const MISSING = [
  'Sem registos locais sobre isso. Posso, porém, detalhar {t}.',
  'A base local não cobre esse tema. Sugiro revermos {t}.',
  'Isso fica fora do âmbito dos ficheiros guardados. Tenho, contudo, dados sobre {t}.',
  'Varri o Guia e os seus documentos sem resultados. Posso apresentar {t}.',
  'Os arquivos locais são omissos e não especulo sem fontes. Quer ver {t}?',
  'Sem referência nos ficheiros. Tenho diretrizes sólidas sobre {t}.',
  'Os registos não cobrem essa variável. Recomendo focarmo-nos em {t}.',
  'Não posso extrair dados que não foram guardados antes. Posso rever {t}.',
  'Isso exige fontes externas que não tenho aqui. Localmente tenho {t}.',
  'A memória local não contempla esse detalhe. Posso adaptar o plano com {t}.',
  'Sem correspondência nos ficheiros. Prefiro admitir a falha a adivinhar. Quer {t}?',
  'Tópico não indexado. Posso resumir antes os procedimentos de {t}.',
  'Os ficheiros neste aparelho não abordam isso. Ajudo com {t}?',
  'Pesquisa local sem resultados. Sugiro abordar o problema via {t}.',
  'Atingimos o limite dos dados locais. Não tenho isso, mas posso analisar {t}.',
  'Para responder com rigor precisaria de outras fontes. Em alternativa, tenho {t}.',
  'Nenhum ficheiro menciona esse ponto. O sensato é revermos {t}.',
  'Não tenho dados locais que sustentem essa resposta. Exploramos {t}?',
  'A documentação local é silenciosa nisso. Não dou palpites; vejamos {t}.',
  'Esse dado não está na memória do sistema. Posso apresentar antes {t}.',
];
const WHY = {
  offline: 'Estamos **sem ligação à internet**, por isso respondo só com o que está guardado no dispositivo.',
  nokey: 'A **IA online não está ligada** (falta a chave nas Definições), por isso respondo com a base local.',
  error: 'A **IA online não respondeu**, por isso respondo com a base local.',
};
export function missing(topicsList = [], reason = 'offline') {
  const t = topicsList.length ? topicsList.slice(0, 3).map((x) => `**${x}**`).join(', ').replace(/, ([^,]*)$/, ' ou $1') : 'os módulos do Guia';
  return `${pick('miss', MISSING).replace('{t}', t)}\n\n_${WHY[reason] || WHY.offline} Para eu consultar mais, importa documentos na aba **Ficheiros IA**._`;
}

// ---------- 6. Fechos (20) ----------
export const CLOSINGS = [
  'Deseja que aprofunde algum ponto ou crie uma checklist?',
  'Quer cruzar isto com os seus documentos ou avançamos?',
  'À disposição para refinar ou simular outros cenários.',
  'Posso resumir estas diretrizes para consulta no terreno, se pedir.',
  'Aguardo indicações. Seguimos para o tema seguinte?',
  'Se houver novas variáveis, partilhe-as para ajustarmos.',
  'Posso verificar recomendações complementares no Guia, se quiser.',
  'Se isto servir, passamos ao planeamento logístico.',
  'Aguardo a sua decisão para detalhar qualquer etapa crítica.',
  'Quer testar este plano contra imprevistos? Faço de advogado do diabo.',
  'Diga-me se quer clarificar algum ponto.',
  'Continuo a vigiar os indicadores ou preparamos o passo seguinte?',
  'Se quiser adaptar isto a restrições específicas, diga quais.',
  'Análise concluída. Precisa de mais dados técnicos?',
  'Pronto para o próximo comando.',
  'Se alguma premissa não se aplicar, diga e eu recalibro.',
  'Posso converter isto num plano por passos, se desejar.',
  'Esta síntese chega ou prefere descer ao detalhe técnico?',
  'Sempre ao dispor. Indique o próximo tópico.',
  'Nada mais a acrescentar. Passamos à verificação de recursos?',
];
export const closing = () => pick('close', CLOSINGS);

// ---------- Quem sou ----------
export const IDENTITY = [
  'Sou o **Mr. Steel**, o assistente da SteelDeck. Consulto o Guia de Sobrevivência, os documentos que importar e os dados da app; com internet e uma chave de IA, raciocino também com uma IA completa.',
  'Chamo-me **Mr. Steel**. Trato de cruzar o Guia, os seus ficheiros e os dados da app para lhe dar respostas com fonte. Sem rede, continuo a funcionar com o que está guardado no dispositivo.',
];
export const identity = () => pick('id', IDENTITY);

// ---------- Limpeza de texto de PDF/OCR ----------
// Tira números de página soltos, cabeçalhos e rodapés repetidos do eBook e espaços a mais.
const NOISE = [
  /^\s*\[?\s*\d{1,4}\s*\]?\s*$/, // "12", "[ 038 ]"
  /^\s*(p[áa]g(ina)?\.?\s*)?\d{1,4}\s*(\/|de)\s*\d{1,4}\s*$/i, // "pág. 3 / 75"
  /^\s*>?\s*STEELDECK\s*\/\/.*$/i, // cabeçalho do eBook e "> STEELDECK // MÓDULO 05"
  /^\s*PANDASTEEL(\s*\[\s*\d+\s*\])?\s*$/i, // rodapé
  /^\s*FIG\.\s*\d+[A-Z]?\s*(\/\/|—|-).*$/i, // legendas e rodapés das figuras
  /^\s*[~·•\-–—]?\s*$/, // restos de desenhos
];
export function cleanNoise(text) {
  const lines = String(text || '').split('\n').filter((l) => !NOISE.some((r) => r.test(l)));
  // rótulos soltos de desenhos (4+ linhas curtas seguidas, sem frases) saem
  const short = (l) => l.trim().length <= 24 && !/[.!?:;]$/.test(l.trim()) && !/^\s*(\d+\.|[■•\-☐▶])/.test(l);
  const keep = lines.map(() => true);
  for (let i = 0; i < lines.length;) {
    let j = i; while (j < lines.length && short(lines[j])) j++;
    if (j - i >= 4) for (let k = i; k < j; k++) keep[k] = false;
    i = j > i ? j : i + 1;
  }
  return lines.filter((_, i) => keep[i]).join('\n')
    .replace(/([a-zà-ú0-9,;(\-])[ \t]*\n(?=[a-zà-ú(])/g, '$1 ') // junta linhas partidas a meio da frase (PDF)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- Intenções simples (antes da pesquisa) ----------
const n = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[!?.,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
const GREET_RE = /^(ola|oi|ole|hey|hello|hi|bom dia|boa tarde|boa noite|boas|saudacoes|mr\.? ?steel|mister steel|steel|estas ai|esta ai|estas por ai|alguem ai|tudo bem|como estas|como vai)( (mr\.? ?steel|steel|tudo bem|como estas))?$/;
const WHO_RE = /^(quem es( tu)?|o que es( tu)?|quem e o mr\.? ?steel|o que fazes|o que sabes fazer|como funcionas|apresenta te|ajuda|help|menu)$/;
const THANKS_RE = /^(obrigad[oa]|muito obrigad[oa]|obg|valeu|thanks|obrigado mr\.? ?steel|perfeito|otimo|excelente|fixe|top)( mr\.? ?steel)?$/;
const CONT_RE = /^(continua|continue|mais|e depois|e entao|segue|seguinte|prossegue|explica melhor|explica|desenvolve|aprofunda|mais detalhes|da exemplos|exemplos|resume|resume isso|resumo|em resumo|sintetiza|tl ?dr|o que mais)( isso| isto| por favor| pf)?$/;
export function intentOf(question) {
  const q = n(question);
  if (!q) return null;
  if (GREET_RE.test(q)) return 'greet';
  if (WHO_RE.test(q)) return 'who';
  if (THANKS_RE.test(q)) return 'thanks';
  if (CONT_RE.test(q)) return /resum|sintet|tl ?dr/.test(q) ? 'summary' : 'continue';
  return null;
}
