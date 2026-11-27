// Taxonomia de temáticas de documentos/livros (filtro da aba MANUAL).
// "chaves": palavras (sem acentos) usadas para sugerir a temática de documentos importados, pelo título e pelo texto.
export const GRUPOS = [
  {
    id: 'ficcao',
    nome: 'Ficção',
    temas: [
      { id: 'romance', nome: 'Romance Contemporâneo', desc: 'Histórias realistas centradas nas relações humanas, dilemas quotidianos e dramas familiares ou amorosos nos dias de hoje.', chaves: ['romance', 'amor', 'familia', 'casamento'] },
      { id: 'scifi', nome: 'Ficção Científica (Sci-Fi)', desc: 'Narrativas baseadas no impacto da ciência e da tecnologia, viagens espaciais, inteligência artificial ou futuros distópicos.', chaves: ['ficcao cientifica', 'sci-fi', 'distopia', 'nave', 'espacial', 'robo'] },
      { id: 'fantasia', nome: 'Fantasia', desc: 'Mundos imaginários ou paralelos onde a magia, criaturas míticas e o sobrenatural governam a realidade. Divide-se frequentemente em Alta Fantasia (mundos totalmente fictícios) e Fantasia Urbana (elementos mágicos no mundo real).', chaves: ['fantasia', 'magia', 'dragao', 'feiticeiro', 'elfo'] },
      { id: 'policial', nome: 'Policial, Mistério e Thriller', desc: 'Histórias focadas na investigação de crimes, enigmas, espionagem e tensão psicológica acelerada.', chaves: ['policial', 'misterio', 'thriller', 'crime', 'detetive', 'espionagem'] },
      { id: 'terror', nome: 'Terror e Horror', desc: 'Obras concebidas para provocar medo, repulsa ou inquietação, usando ameaças sobrenaturais ou psicológicas.', chaves: ['terror', 'horror', 'fantasma', 'assombr'] },
      { id: 'historica', nome: 'Ficção Histórica', desc: 'Enredos ficcionais situados em períodos reais do passado, com rigorosa reconstrução de época.', chaves: ['romance historico', 'ficcao historica'] },
      { id: 'aventura', nome: 'Aventura e Ação', desc: 'Narrativas marcadas por viagens, perigos físicos, expedições e ritmo acelerado.', chaves: ['aventura', 'expedicao', 'acao'] },
      { id: 'satira', nome: 'Sátira e Humor', desc: 'Obras que utilizam a ironia, o exagero e a comédia para criticar costumes, a política ou a sociedade.', chaves: ['satira', 'humor', 'comedia', 'piada'] },
      { id: 'bd', nome: 'Banda Desenhada e Novel Gráfica (Graphic Novel)', desc: 'Histórias narradas através da combinação sequencial de texto e ilustração (inclui mangá japonês e comics).', chaves: ['banda desenhada', 'manga', 'comics', 'graphic novel'] },
    ],
  },
  {
    id: 'nao-ficcao',
    nome: 'Não-Ficção',
    temas: [
      { id: 'biografia', nome: 'Biografia, Autobiografia e Memórias', desc: 'Relatos da vida de personalidades reais ou experiências pessoais marcantes do próprio autor.', chaves: ['biografia', 'autobiografia', 'memorias'] },
      { id: 'historia', nome: 'História e Política', desc: 'Análises de acontecimentos passados, civilizações, conflitos e sistemas políticos.', chaves: ['historia', 'politica', 'guerra', 'civilizac', 'conflito', 'governo'] },
      { id: 'ensaio', nome: 'Ensaio e Filosofia', desc: 'Textos reflexivos e argumentativos sobre ideias, cultura, ética ou comportamento humano.', chaves: ['ensaio', 'filosofia', 'etica'] },
      { id: 'ciencia', nome: 'Divulgação Científica', desc: 'Explicação acessível de temas complexos de física, biologia, psicologia, astronomia ou tecnologia para o público geral.', chaves: ['ciencia', 'fisica', 'biologia', 'astronomia', 'medicina', 'primeiros socorros', 'tecnologia'] },
      { id: 'autoajuda', nome: 'Desenvolvimento Pessoal e Autoajuda', desc: 'Guias práticos sobre produtividade, saúde mental, finanças pessoais e hábitos.', chaves: ['guia', 'manual', 'sobrevivencia', 'habitos', 'produtividade', 'saude mental', 'emergencia'] },
      { id: 'negocios', nome: 'Negócios, Economia e Gestão', desc: 'Obras sobre liderança, empreendedorismo, estratégia empresarial e funcionamento dos mercados.', chaves: ['negocio', 'economia', 'gestao', 'mercado', 'empresa', 'financ'] },
      { id: 'viagens', nome: 'Viagens e Reportagem', desc: 'Crónicas de exploração geográfica, relatos jornalísticos aprofundados e investigação social.', chaves: ['viagem', 'viagens', 'reportagem', 'roteiro', 'orientacao', 'mapa'] },
      { id: 'artes', nome: 'Artes, Culinária e Estilo de Vida', desc: 'Livros ilustrados ou práticos sobre arquitetura, fotografia, gastronomia, jardinagem e bem-estar.', chaves: ['culinaria', 'receita', 'jardinagem', 'fotografia', 'arquitetura', 'plantas'] },
      { id: 'religiao', nome: 'Religião e Espiritualidade', desc: 'Textos sagrados, teologia, práticas meditativas e estudos sobre crenças.', chaves: ['religiao', 'espiritual', 'teologia', 'meditac', 'biblia'] },
    ],
  },
];

export const TEMAS = GRUPOS.flatMap((g) => g.temas.map((tm) => ({ ...tm, grupo: g.id })));
export const temaById = Object.fromEntries(TEMAS.map((tm) => [tm.id, tm]));

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Temáticas de um documento importado: as que o utilizador definiu (doc.themes) ou, sem isso, sugeridas pelas palavras
// do título e das primeiras páginas (no máximo 2). O Guia do sistema é um manual prático (autoajuda + divulgação científica).
export function temasDoDoc(d) {
  if (Array.isArray(d?.themes) && d.themes.length) return d.themes;
  if (d?.system) return ['autoajuda', 'ciencia'];
  const txt = ` ${norm(`${d?.title || ''} ${d?.title || ''} ${(d?.pages || []).slice(0, 3).join(' ').slice(0, 4000)}`)} `;
  return TEMAS.map((tm) => ({ id: tm.id, n: tm.chaves.reduce((s, k) => s + (txt.split(norm(k)).length - 1), 0) }))
    .filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 2).map((x) => x.id);
}

// Livros de exemplo (pré-visualização do filtro em tempo real)
export const LIVROS_EXEMPLO = [
  { titulo: 'A Casa das Marés', autor: 'Inês Valadares', temas: ['romance'] },
  { titulo: 'Órbita Zero', autor: 'Rui Tavares Pinto', temas: ['scifi', 'aventura'] },
  { titulo: 'O Último Guardião de Ébano', autor: 'Marta Leal', temas: ['fantasia'] },
  { titulo: 'Silêncio na Ribeira', autor: 'João Amaral', temas: ['policial'] },
  { titulo: 'A Quinta do Nevoeiro', autor: 'Sofia Brandão', temas: ['terror'] },
  { titulo: 'Cartas de 1755', autor: 'Pedro Lacerda', temas: ['historica', 'romance'] },
  { titulo: 'Crónica de um Funcionário Exemplar', autor: 'Tiago Mesquita', temas: ['satira'] },
  { titulo: 'Os Céus Explicados aos Curiosos', autor: 'Ana Figueira', temas: ['ciencia'] },
  { titulo: 'Hábitos de Ferro', autor: 'Carlos Domingues', temas: ['autoajuda', 'negocios'] },
  { titulo: 'Rotas do Minho a Pé', autor: 'Beatriz Couto', temas: ['viagens', 'artes'] },
];
