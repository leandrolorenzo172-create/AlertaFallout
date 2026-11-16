// ============================================================
// MANUAL DE SOBREVIVÊNCIA AVANÇADO — Dados das Secções
// Inclui imagens ilustrativas geradas para secções-chave
// ============================================================

import { Shield, Droplets, Flame, Home, MapPin, Heart, Zap, Radio, Wrench, Wind, Leaf, Brain, Waves, Cloud, Crosshair, Axe, TreePine, Fish, Bandage, Compass, Book } from 'lucide-react';

export const manualSections = [
  // ============================================================
  // SECÇÕES EXISTENTES (atualizadas com mais detalhe)
  // ============================================================
  {
    id: 'kit',
    icon: Shield,
    title: 'Kit de Sobrevivência (Bug Out Bag)',
    content: `**O QUE TER SEMPRE PREPARADO (72h, 1 pessoa):**

**ÁGUA:**
• 3L água (mín. 3L/pessoa/dia = 9L para 72h)
• Filtro portátil (LifeStraw/Sawyer) OU pastilhas de cloro
• Garrafa metálica (para ferver)

**COMIDA:**
• Comida não perecível (ver secção "Alimentos")
• Ração: 2500 kcal/dia mínimo

**ABRIGO/VESTUÁRIO:**
• Manta térmica (mylar) — reflete 90% calor
• Lona/toldo 2×3m
• Muda de roupa (camadas)
• Impermeável/capa de chuva

**FOGO:**
• 2 isqueiros + fósforos (recipiente estanque)
• Ferro de magnésio (funciona molhado)
• Tinder (algodão + vaselina)

**FERRAMENTAS:**
• Faca multiusos/canivete suíço
• Faca fixa (resistente)
• Corda/paracord 15m
• Fita adesiva (duct tape)
• Sacos do lixo grandes (abrigo de emergência)
• Lanterna + pilhas extra (ou manivela)
• Apito
• Espelho de sinal
• Bússola
• Mapa da zona (impresso)

**PRIMEIROS SOCORROS:**
• Pensos, gaze, adesivos
• Desinfetante (clorohexidina/álcool)
• Lixívia (desinfetar água/superfícies)
• Analgésicos (paracetamol, ibuprofeno)
• Antidiarreico, antialérgico
• Fita adesiva médica (Steri-Strips)
• Torniquete

**DOCUMENTOS:**
• Cópias BI/CC, passaporte (saco estanque)
• Dinheiro (notas pequenas + moedas)
• Lista de contactos de emergência

**PESO IDEAL:** 10-15kg (máx. 25% do peso corporal).`,
  },
  {
    id: 'abrigo',
    icon: Home,
    title: 'Abrigos Táticos e Engenharia de Campanha',
    image: 'https://media.base44.com/images/public/6991c783b386d10a0c2ee918/38fce91d2_generated_image.png',
    content: `**SELEÇÃO DE LOCAL — 4 CRITÉRIOS:**
1. Elevação média (evitar fundos de vale)
2. Proteção do vento dominante (Norte/Noroeste em PT)
3. Distância mín. 30m de árvores mortas ou rochas instáveis
4. Acesso a material (madeira, folhas, água) num raio de 50m

**TIPO A — LEAN-TO (ALPENDRE):**
1. Selecionar 2 árvores a 2,5m de distância, vento nas costas
2. Atar trave-mestra (ø 8-10cm) a 1,5m de altura (nó volta do fiel + 2 cotes)
3. Apoiar 6-8 ramos (ø 4-6cm, 2m comp.) a 45° sobre a trave, espaçados 15cm
4. Cobrir com 30cm de folhas/ramos/musgo (de baixo para cima, como telhas)
5. Refletor de calor: parede de troncos a 1m da fogueira, 1,5m × 1m

**⚠️ FALHA COMUM:** Inclinação <30° → água infiltra. >60° → vento derruba.

**TIPO B — TRINCHEIRA DE NEVE/FRIO:**
1. Cavar 2m × 60cm × 80cm na neve compactada
2. Forrar fundo com 15cm de ramos de pinheiro
3. Cobrir com troncos a 90cm + lona/ramagem
4. Fenda de ventilação de 10cm (risco de CO)

**TIPO C — ABRIGO DE DETRITOS (DEBRIS HUT):**
1. Trave-mestra a 1,2m apoiada em 2 forquilhas
2. Ramos a 45° dos dois lados, 60cm comp.
3. Cobrir com 60cm de folhas secas/musgo
4. Forrar interior com 30cm de material seco

**ISOLAMENTO TÉRMICO:**
• Solo rouba 3x mais calor que o ar. SEMPRE isolar do solo (mín. 15cm ramos/cartão)
• Manta mylar reflete 90% calor — lado brilhante para dentro

**CORDAMES NATURAIS (Minho):**
• Giesta: fibras internas amolecidas em água 24h, trançar 3 fibras
• Casca de salgueiro: tiras de 2m, secar, rehumedecer antes de usar
• Urtiga: caules altos, esmagar, separar fibras, trançar

**REGRA DO 3:** 3 min sem ar, 3h sem abrigo, 3 dias sem água, 3 semanas sem comida.`,
  },
  {
    id: 'armadilhas',
    icon: Crosshair,
    title: 'Armadilhas Táticas de Gatilho Mecânico',
    image: 'https://media.base44.com/images/public/6991c783b386d10a0c2ee918/c615897f4_generated_image.png',
    content: `**REGRA DE OURO:** Colocar 6-8 armadilhas em trilhos ativos (caminhos de animais). Verificar ao amanhecer e ao anoitecer.

**A — LAÇO DE MOLA (SPRING POLE SNARE):**
1. Selecionar sapo flexível (ø 3-4cm) a 1,5m do trilho
2. Curvar sapo até copa a 1m do solo. Amarrar corda à copa
3. Gatilho: 2 varas em L com entalhe em bisel a 5mm profundidade
4. Laço de arame (ø 1mm, 12cm diâmetro) preso à corda
5. Posicionar laço a 10-15cm do solo, sobre o trilho
6. Armar: engatar gatilho. Animal toca → sapo solta → laço fecha

**⚠️ FALHA:** Laço baixo demais (passa por cima) ou alto demais (passa por baixo). Altura = 1,5× diâmetro do corpo do animal.

**B — FIGURE-4 DEADFALL:**
1. 3 varas: vertical (20cm), diagonal (15cm), horizontal (15cm)
2. Entalhar em bisel a 45° nos 3 pontos de contacto
3. Montar em "4": vertical apoia pedra, diagonal liga, horizontal sustenta isca
4. Pedra plana de 10-15kg sobre a vara vertical
5. Isca na horizontal. Animal puxa → estrutura colapsa → pedra cai

**⚠️ FALHA:** Entalhes <3mm → dispara sozinho. Pedra <5kg → fere, não mata.

**C — PAIUTE DEADFALL (Mais sensível):**
1. Vertical (30cm) + horizontal (15cm) com entalhe em L
2. Fio liga horizontal a estaca curta (5cm) enterrada
3. Pedra 10-20kg. Animal toca fio → colapsa

**D — LAÇOS PARA AVES:**
1. Laço de arame ø 1mm, 8cm diâmetro
2. Em poleiro noturno (ramo sobre água/aberto)
3. 3-5 laços por árvore, 5cm do ramo, abertura para baixo

**E — ARMADILHAS DE PESCA:**
• **Garrafo:** Garrafa PET cortada, invertida, isca dentro
• **Linha de anzóis:** 3-5 anzóis, isca, presa a estaca na margem
• **Laço de nylon:** Sobre ninho de peixes, puxar rápido`,
  },
  {
    id: 'armas',
    icon: Axe,
    title: 'Armas Improvisadas de Defesa e Caça',
    image: 'https://media.base44.com/images/public/6991c783b386d10a0c2ee918/7c9f1cfbd_generated_image.png',
    content: `**A — ARCO E FLECHA ARTESANAL:**
1. Estaca de freixo, carvalho ou azinho (ø 4-5cm, 1,5-1,8m)
2. Secar 2-3 dias ao sol ou sobre fogo
3. Talhar: centro ø 5cm, pontas ø 2cm (simétrico!)
4. Entalhar pontas (1cm) para corda
5. Corda: paracord, tendão, ou fibras de urtiga trançadas (3 fios)
6. Tensão: envergar até 15-20cm do centro (tração ~20-30kg)
7. Flecha: vara 60-80cm, ø 8mm, reta
8. Ponta: sílex lascado, osso, ou metal afiado. Encaixar + amarrar + resina
9. Nóck: entalhe em V na base para corda
10. Empenagem: 3 penas a 120° na base, estabiliza voo

**⚠️ FALHA:** Arco assimétrico → flecha desvia. Afinar simetricamente.

**B — LANÇA ENDURECIDA AO FOGO:**
1. Vara 1,8-2m, ø 3-4cm (freixo, carvalho)
2. Descascar e alisar
3. Talhar ponta em bisel 30° (10-15cm comp.)
4. Endurecer: ponta em brasa 5-10 min até escurecer
5. Alternativa: ponta de sílex/osso/metal + resina de pinheiro (cola)

**C — ESTILINGUE/FUNDA:**
1. 2 tiras de couro/tecido (60cm cada)
2. Bolsa central: couro 8×12cm com 2 furos
3. Uma ponta com laçada para dedo, outra solta
4. Munição: pedras lisas 2-4cm ø
5. Girar 3-5 voltas, largar corda solta na mira
6. Alcance: 15-20m. Praticar em alvo

**D — CLAVA PESADA:**
1. Tronco 60-80cm, ø 6-8cm, madeira densa (carvalho)
2. Opcional: entalhar ponta de sílex/metal na base

**E — PONTAS DE PEDRA LASCADA:**
1. Núcleo de sílex/quartzo (pedra dura)
2. Percussor (pedra mais dura e redonda)
3. Bater na borda a 30-45° → lascas afiadas
4. Selecionar lasca triangular 3-5cm
5. Retocar bordas com percussor fino (pressão)
6. Encaixar em entalhe, amarrar + resina

**F — FACA IMPROVISADA:**
• Sílex lascado: afiada mas frágil (não bater)
• Vidro: muito afiada, frágil
• Lata de metal: cortar, afiar em pedra
• Osso: afiar contra pedra, endurecer ao fogo`,
  },
  {
    id: 'caça',
    icon: Fish,
    title: 'Caça, Pesca e Preparação de Animais',
    content: `**PROTOCOLO DE PREPARAÇÃO DE CAÇA:**

**1. ESFOLAMENTO:**
• Pendurar pelo tendão de Aquiles (cabeça para baixo)
• Cortar pele em V da garganta à cauda
• Puxar para baixo com mãos/faca (usar punho, não lâmina — evita cortar carne)
• Remover pele das pernas: cortar em V interior das patas

**2. EVACUAÇÃO:**
• Cortar abdómen (faca, cuidado para não perfurar intestinos)
• Retirar vísceras com mãos
• PRESERVAR: coração, fígado, rins — comestíveis e nutritivos
• Descartar: intestinos, estômago, bexiga (contaminam carne)

**3. DEFUMAÇÃO (conservar sem refrigeração):**
1. Construir fumatório: fogo pequeno, grelha de ramos a 1,5m altura
2. Lenha verde/densa (mais fumo) — amieiro, salgueiro, ramos com folhas
3. Fumo a 60°C (NÃO fogo aberto — seca, não cozinha)
4. Tiras de carne de 2-3cm, pendurar 6-12h
5. Carne rígida e escura = pronta. Conserva 1-2 semanas

**4. SECAGEM (CHARQUE/JERKY):**
1. Tiras de 5mm espessura, 3-5cm largura
2. Pendurar ao sol e vento (cobrir das moscas com gaze/redes)
3. 2-3 dias até quebradiça (não dobra)
4. Conserva meses. Rehidratar em água antes de comer

**5. CONSERVAÇÃO ALTERNATIVA:**
• **Salga:** Cobrir em sal grosso. Conserva 6+ meses
• **Salmoura:** 40% sal em água. Submergir. Conserva meses
• **Mel:** Submergir carne em mel (antissético). Conserva meses

**PESCA IMPROVISADA:**
• **Anzol:** Alfinete/agrafo dobrado, osso afiado, espinha de peixe
• **Linha:** Fio de pesca, nylon, linha dental, fibras trançadas
• **Iscas:** Minhoca, inseto, pedaço de peixe, miolo de pão
• **Melhor hora:** Amanhecer e anoitecer
• **Ninhos:** Procurar locais com sombra, pedras, raízes — peixes escondem-se

**INSETOS COMESTÍVEIS (último recurso):**
• **Comestíveis:** Formigas (remover asas), gafanhotos (cozer), larvas de madeira (cozer), caracóis (cozer bem)
• **EVITAR:** Insetos coloridos (vermelho, amarelo, laranja — tóxicos), insetos peludos, insetos com cheiro forte
• **SEMPRE cozer** insetos (eliminam parasitas)`,
  },
  {
    id: 'agua',
    icon: Droplets,
    title: 'Purificação de Água (Técnicas Avançadas)',
    image: 'https://media.base44.com/images/public/6991c783b386d10a0c2ee918/471fcbcc0_generated_image.png',
    content: `**PRIORIDADE:** Sem água potável, morte em 3 dias. Água contaminada → diarreia → morte em 2 dias.

**A — DESTILADOR SOLAR DE SOLO:**
1. Cavar buraco cónico de 1m diâmetro × 60cm prof.
2. Recipiente limpo no centro
3. Vegetação verde nas bordas (transpiração)
4. Cobrir com plástico transparente, selar bordas
5. Pedra no centro do plástico (acima do recipiente)
6. Sol evapora → condensa → escorre para recipiente
7. Rendimento: 0,5-1L/dia. Repetir em vários locais

**B — FILTRO DE SEDIMENTAÇÃO (5 CAMADAS):**
1. Garrafa PET cortada ao meio, topo invertido na base
2. Camada 1 (base): Algodão/pano fino
3. Camada 2: Carvão ativado (esmagar carvão de fogueira, 5cm)
4. Camada 3: Areia fina (5cm)
5. Camada 4: Areia grossa (5cm)
6. Camada 5 (topo): Cascalho (5cm)
7. Verter água turva, recolher na base

**⚠️ AVISO:** Remove sedimentos e químicos, NÃO mata bactérias. SEMPRE ferver após filtrar.

**C — EBULIÇÃO CONTROLADA:**
• Ferver 1 min mínimo (3 min acima de 2000m)
• Mata 99,9% patogénios
• Sabor flat → arejar (transvasar) ou adicionar carvão

**D — CLORAÇÃO CASEIRA:**
• Lixívia 5% (SEM perfume): 2 gotas/L (clara), 8 gotas/L (turva)
• Esperar 30 min (60 min se fria)
• Cheiro leve a cloro = seguro

**E — SODIS (DESINFECÇÃO SOLAR):**
• Garrafa PET transparente (NÃO vidro, NÃO corada)
• Encher 3/4, agitar para oxigenar, fechar
• Sol direto 6h (ou 2 dias se nublado)

**F — IODO:**
• Tintura 2%: 5 gotas/L (10 se turva)
• Esperar 30 min. NÃO usar em gravidez/tiroide

**FONTES (Minho/Braga):**
1. Água canalizada | 2. Chuva recolhida | 3. Nascentes (Gerês, Cabreira, Sameiro)
4. Rios Cávado e Este (SEMPRE purificar) | 5. Orvalho | 6. Transpiração de plantas

**NUNCA BEBER:** Água salgada, parada com espuma, zonas industriais, urina.`,
  },
  {
    id: 'fogo',
    icon: Flame,
    title: 'Técnicas de Fogo (12 Métodos)',
    image: 'https://media.base44.com/images/public/6991c783b386d10a0c2ee918/ba075c408_generated_image.png',
    content: `**FRICÇÃO — A — ARCO DE FOGO (BOW DRILL):**
1. Fuso: vara 20-25cm, ø 2,5-3cm, madeira seca macia (cedro, salgueiro, amieiro)
2. Base: tábua 30×5×2cm, mesma madeira
3. Arco: vara flexível 80cm + corda
4. Apoio: pedra com depressão OU osso
5. Entalhe em V na base + depressão central
6. Corda do arco enrola 1 volta no fuso. Fuso vertical, apoio no topo
7. Tinder ao lado do entalhe (fibras secas, casca de bétula)
8. Joelho no chão, peito sobre joelho. Arco em vaivém rápido
9. Iniciar lento, acelerar quando sair fumo denso
10. Pó incandesce no entalhe → cair no tinder → soprar suavemente até chama

**⚠️ FALHA:** Madeira húmida → fumo sem brasa. Usar madeira seca (som oco). Corda frouxa → fuso escorrega.

**B — FRICÇÃO POR ARADO (FIRE PLOW):**
1. Base 60cm, sulco central 30cm, 1cm prof.
2. Vara 25cm, ponta em bisel
3. Esfregar no sulco em vaivém rápido, pressão descendente

**C — BOMBA DE FOGO (PUMP DRILL):**
1. Eixo vertical com volante (pedra) na base
2. Corda cruzada no topo, ligada a barra horizontal
3. Pressionar → rotação. Mais eficiente que bow drill

**IMPACTO/QUÍMICA:**
• **D — Pederneira:** Ferro de magnésio + raspador. Raspas + faísca 3000°C. Fiável molhado.
• **E — Bateria + palha de aço:** 9V ou carro, curto-circuito sobre palha de aço
• **F — Lente:** Garrafa de água, gelo, óculos → focar sol em tinder
• **G — Químico:** Permanganato de potássio + glicerina → ignição

**TINDER (por prioridade):**
1. Algodão + vaselina (arde 5+ min, à prova de água)
2. Casca de bétula seca (arde molhado)
3. Resina de pinheiro (chama intensa)
4. Penugem de roseira-brava
5. Palha de aço fina

**CONSTRUIR FOGUEIRA:**
1. Limpar 1,5m diâmetro até terra nua
2. Tinder no centro
3. Kindling (gravetos ø 3-5mm) em "tenda"
4. Acender, adicionar lenha: ø 1cm → 3cm → 5cm+

**TIPOS DE FOGUEIRA:**
• Tenda (teepee) — chama rápida, iniciar
• Cabana (log cabin) — duradoura, cozinhar
• Estrela — troncos em raios
• Trincheira — protegida do vento
• Refletor — troncos atrás para refletir calor`,
  },
  {
    id: 'plantas',
    icon: Leaf,
    title: 'Plantas: Identificação, Comestibilidade e Preparação',
    image: 'https://media.base44.com/images/public/6991c783b386d10a0c2ee918/77af7e6ed_generated_image.png',
    content: `**PLANTAS COMESTÍVEIS (Norte de Portugal):**

**1. DENTE-DE-LEÃO (Taraxacum):**
• ID: Folhas dentadas em roseta, flor amarela, caule oco com leite
• Comestível: Folhas (salada/cozidas), raiz (torrar = café), flores (fritas)
• Preparação: Folhas jovens antes da floração = menos amargas. Ferver 5 min

**2. URTIGA (Urtica dioica):**
• ID: Folhas opostas serradas, pelos urticantes. Até 1,5m
• Comestível: Folhas e rebentos (SEMPRE cozidos — destrói toxina)
• Preparação: Colher com luvas. Ferver 5-10 min. Sopas, chá, espinafre
• Chá: 10g folhas secas em 200ml. Diurético, rico em minerais

**3. BELDROEGA (Portulaca oleracea):**
• ID: Folhas carnudas em espátula, rastejante, caule avermelhado
• Comestível: Folhas e caule (cru ou cozido). Sabor ácido. Ricas em ómega-3
• Preparação: Lavar bem. Salada ou refogar 3-5 min

**4. MEDRONHO (Arbutus unedo):**
• ID: Folhas serradas verde-escuras, fruto vermelho granulado
• Comestível: Fruto maduro (vermelho vivo). Verdes causam náusea
• Preparação: Cru ou compota/aguardente

**5. FUNCHO SILVESTRE (Foeniculum):**
• ID: Folhas plumosas (anis), caule estriado verde-azulado, flor amarela em umbela
• Comestível: Bulbo, folhas, sementes. Sabor a anis
• Preparação: Bulbo cru/cozido. Sementes secas = tempero/chá digestivo

**6. SILVA / AMORA (Rubus):**
• ID: Arbusto espinhoso, folhas 3-5 folíolos, fruto preto maduro
• Comestível: Frutos (pretos), folhas jovens (chá), rebentos (cozidos)
• Preparação: Frutos crus/compota. Folhas secas = chá antidiarreico

**7. ACÁCIA (Acacia dealbata):**
• ID: Folhas bipinadas, flor amarela fofa (fev-mar)
• Comestível: Flores (cruas/fritas), sementes (tostadas)
• Preparação: Flores em salada ou fritas. Chá de flores

**8. ROSA-CANINA (Rosa canina):**
• ID: Arbusto espinhoso, folhas 5-7 folíolos, fruto vermelho oval (bagas)
• Comestível: Bagas (cinorrodon) — 20× vitamina C da laranja
• Preparação: Remover sementes (peludas, irritantes). Esmagar, chá ou compota

**PLANTAS TÓXICAS — NUNCA COMER:**
• Ervaninha (Aconitum): Flores azuis em capacete. 2mg MATA
• Beladona: Bagas pretas brilhantes. Mortal
• Estramónio (Datura): Flores brancas/roxas, cápsula espinhosa. Mortal
• Tolo/Teixo (Taxus): Bagas vermelhas — polpa ok, semente MORTAL
• Cólquico: Parece alho-porro, flores rosadas outonais. Mortal
• Digitalis (Dedaleira): Flores em espiga roxas/rosas. Tóxica cardíaca
• Eufórbias: Leite branco irritante
• Hera: Bagas e folhas tóxicas

**REGRAS DE SEGURANÇA:**
1. NUNCA cogumelos sem identificação absoluta
2. Evitar plantas com leite branco (exceto dente-de-leão)
3. Evitar plantas com 3 folhas (hera venenosa)
4. Evitar sementes/frutos desconhecidos
5. TESTE UNIVERSAL: pele (15 min) → lábios → mastigar (5 min, não engolir) → engolir pequeno (esperar 2h) → comer colher (esperar 6h)
6. Testar alergias individuais — começar com pequena quantidade`,
  },
  {
    id: 'arvores',
    icon: TreePine,
    title: 'Árvores Úteis: Identificação e Usos',
    content: `**1. FREIXO (Fraxinus):**
• ID: Folhas compostas 7-13 folíolos serrados, casca cinza, gomos pretos
• Usos: Madeira flexível e resistente — ARCOS, lanças, cabos de ferramenta
• Tratamento: Secar 2-3 dias ao sol. Não rachar (flexível)

**2. CARVALHO (Quercus robur):**
• ID: Folhas lobadas (5-7 lóbulos), bolotas em cachos, casca cinza-escamosa
• Usos: Madeira densa — lanças, clavas, pontas. Casca = taninos (antissético)
• Bolotas: Ferver 3x trocando água (remover taninos), ou assar e moer = farinha
• Casca: Ferver 20g em 200ml = antissético para feridas

**3. PINHEIRO-BRAVO (Pinus pinaster):**
• ID: Agulhas em pares (10-20cm), casca avermelhada, pinhas ovais
• Usos:
  - Resina: Antissético, cola, vedante. Recolher de feridas na árvore
  - Agulhas: Chá vitamina C (10g em 200ml quente 10 min)
  - Lenha: Arde rápido (resinoso), excelente para acender
  - Tinder: Agulhas secas + resina
  - Pinhões: Sementes comestíveis

**4. SALGUEIRO (Salix alba):**
• ID: Folhas lanceoladas serradas, prateadas por baixo, junto a água
• Usos:
  - Casca: Salicina = aspirina natural. Ferver 30g em 500ml, 15 min
  - Ramos jovens: Flexíveis — cordame natural (tiras de casca, amolecidas em água)
  - Abrigos: Ramos flexíveis para estrutura

**5. AMIEIRO (Alnus glutinosa):**
• ID: Folhas arredondadas cónicas, verde-escuras. Junto a água
• Usos:
  - Madeira: Não apodrece em água — estacas, pontes, contentores
  - Folhas: Papel higiênico natural (largas, macias)
  - Casca: Corante, taninos

**6. BÉTULA (Betula):**
• ID: Casca branca que descama em tiras, folhas triangulares serradas
• Usos:
  - Casca: EXCELENTE tinder — arde mesmo molhada (resina natural)
  - Seiva: Bebível diretamente (primavera). Furar tronco
  - Contentores: Casca em folhas — recipientes impermeáveis
  - Madeira: Leve, boa para armas

**7. SOBREIRO (Quercus suber):**
• ID: Casca grossa suberosa (cortiça), folhas serradas persistentes
• Usos:
  - Cortiça: Isolamento térmico (abrigo), flutuador (pesca), palmilhas
  - Lenha: Densa, arde muito tempo

**8. CASTANHEIRO (Castanea sativa):**
• ID: Folhas grandes lanceoladas serradas, fruto espinhoso (castanha)
• Usos:
  - Castanhas: Comestíveis (assar/fervar). Ricas em hidratos, conservam secas
  - Madeira: Resistente, flexível — cercas, cabos
  - Folhas: Chá (antitússico)

**9. EUCALIPTO (Eucalyptus):**
• ID: Folhas falciformes (curvas), aroma mentolado, casca descasca
• Usos:
  - Folhas: Chá ou inalação = descongestionante, antissético respiratório
  - Óleo: Esfregar folhas na pele = repelente de insetos
  - Lenha: Arde bem, madeira densa

**REGRAS DE COLHEITA DE MADEIRA:**
1. Procurar madeira morta em pé (seca, mais limpa que a do chão)
2. Verde = flexível (abrigos, arcos). Seca = dura (lanças, ferramentas)
3. NUNCA cortar árvore viva sem necessidade
4. Teste secura: partir — som oco = boa. Som húmido/macio = verde`,
  },
  {
    id: 'alimentos',
    icon: Zap,
    title: 'Alimentos Não Perecíveis e de Alto Rendimento',
    content: `**A — ALIMENTOS NÃO PERECÍVEIS (LONGO PRAZO):**

| Alimento | Duração | kcal/100g | Notas |
|---|---|---|---|
| Arroz branco | 25-30 anos (selado) | 360 | Hidrato, base |
| Feijão seco | 25-30 anos | 340 | Proteína + fibra |
| Aveia | 25-30 anos | 380 | Hidrato, energia |
| Mel | Indefinido | 300 | Calorias + antissético |
| Sal | Indefinido | 0 | Eletrólitos, conservante |
| Açúcar | Indefinido | 400 | Energia rápida |
| Leite em pó | 20-25 anos (selado) | 500 | Proteína + cálcio |
| Massa seca | 2-3 anos | 380 | Hidrato |
| Enlatados | 2-5 anos | 200-300 | Proteína, variedade |
| Óleo | 1-2 anos | 900 | Calorias densas |

**ARMAZENAMENTO IDEAL:**
1. Recipientes herméticos (vidro, plástico grosso + silica gel)
2. Local fresco (10-15°C), escuro, seco
3. Rotação FIFO — consumir mais antigo primeiro
4. Verificar: bolor, cheiro estranho, latas inchadas (NÃO comer)

**B — ALIMENTOS DE ALTO RENDIMENTO (MAIOR CALORIA/PESO):**

Para mochila de emergência, priorizar densidade calórica:

1. Óleo/Azeite — 900 kcal/100g. Absorção de vitaminas
2. Manteiga de amendoim — 590 kcal/100g. Proteína + gordura
3. Frutos secos (nozes, amêndoas) — 600 kcal/100g. Proteína, gorduras
4. Chocolate negro — 500 kcal/100g. Energia rápida, moral
5. Barras energéticas — 350-450 kcal/100g. Compactas
6. Carne seca (charque/jerky) — 300 kcal/100g. Proteína, sem frio
7. Queijo curado — 400 kcal/100g. Proteína + cálcio, semanas
8. Sementes (girassol/abóbora) — 570 kcal/100g. Proteína, minerais
9. Mel — 300 kcal/100g. Energia + antissético
10. Pão rijo/biscoitos — 400 kcal/100g. Hidrato, longa duração

**C — NECESSIDADES CALÓRICAS EM SOBREVIVÊNCIA:**
• Sedentário (abrigo): 1500-1800 kcal/dia
• Atividade moderada (deslocação): 2500-3000 kcal/dia
• Atividade intensa (construção, caça): 3500-4500 kcal/dia
• Frio extremo (<5°C): +500-1000 kcal/dia (termorregulação)

**D — RAÇÃO DE EMERGÊNCIA (KIT 72h, 1 pessoa):**
• 1kg arroz/aveia (3500 kcal)
• 500g feijão (1700 kcal)
• 200g óleo (1800 kcal)
• 100g sal (essencial)
• 500g enlatados (proteína)
• 200g mel/açúcar (energia rápida)
• Total: ~7500 kcal = 2500 kcal/dia × 3 dias

**E — CONSERVAÇÃO SEM REFRIGERAÇÃO:**
1. Defumação: Fumo 60°C, 6-12h. Carne/peixe conserva 1-2 semanas
2. Secagem (charque): Tiras 5mm, sol/vento 2-3 dias. Conserva meses
3. Salga: Cobrir em sal grosso. Conserva 6+ meses
4. Salmoura: 40% sal em água. Submergir. Conserva meses
5. Mel: Submergir carne em mel. Conserva meses
6. Fermentação: Chucrute (repolho + sal) — meses, vitamina C`,
  },
  {
    id: 'medicina',
    icon: Bandage,
    title: 'Medicina de Abrigo e Primeiros Socorros Extremos',
    content: `**A — TORNIQUETE DE EMERGÊNCIA:**
1. Indicação: Hemorragia massiva de membro, não controlável por pressão
2. Material: Tira de tecido largo (mín. 5cm) — NUNCA corda/fio fino
3. Local: 5-7cm acima da ferida, em direção ao coração. NUNCA sobre articulação
4. Aplicação: Enrolar 2 voltas → nó simples → pau sobre nó → 2 nós → rodar pau até parar sangramento → fixar
5. Tempo: Anotar HORA na testa. Máx. 2h sem risco de necrose
6. NÃO remover — só profissional médico

**⚠️ FALHA:** Aperto insuficiente → sangra e dói. Apertar até pulso distal desaparecer.

**B — SUTURA E FECHO DE FERIDAS:**
• Fita (Steri-Strips): Limpar, secar, colar tiras paralelas a 5mm, puxando bordas. 5-7 dias
• Sutura improvisada: Agulha de costura + fio de pesca/nylon (fervidos). Anestesia: gelo/álcool. Pontos simples a 1cm. Remover 7-10 dias
• Grampos: Fitas metálicas em U, pinçar bordas

**C — CAUTERIZAÇÃO (ÚLTIMO RECURSO):**
• Metal ao rubro, pressionar 2-3s sobre vaso sangrante
• Risco: Dano tecidual, infecção. Só se vida em risco
• Após: Cobrir com pano limpo, vigiar infecção

**D — FARMÁCIA NATURAL (Norte de Portugal):**

**ANTISSÉPTICOS:**
• Casca de carvalho (taninos): Ferver 20g em 200ml, 10 min. Lavar feridas
• Musgo Sphagnum: Aplicar direto — absorve, antissético (usado na WW1)
• Resina de pinheiro: Sobre cortes — antissético, vedante

**ANALGÉSICOS:**
• Casca de salgueiro (salicina = aspirina): Ferver 30g em 500ml, 15 min. 1 chávena, máx. 3/dia
• Folha de tília: Chá (infusão 10 min). Sedativo, dor de cabeça
• Hiperição: Óleo (flores em azeite 40 dias ao sol) — queimaduras/feridas

**CICATRIZANTES:**
• Hiperição: Óleo ou cataplasma de folhas esmagadas
• Tília: Cataplasma de folhas frescas sobre queimaduras
• Dente-de-leão: Seiva das folhas sobre verrugas/feridas
• Plantago (Tanchagem): Folhas esmagadas sobre feridas, picadas

**E — PRIMEIROS SOCORROS GERAIS:**
• ABC: Via aérea → Respiração → Circulação
• Hemorragia: Pressão direta + elevar membro. Torniquete só último recurso
• Fratura: Imobilizar acima e abaixo. Não endireitar. Talas: ramos, revistas
• Queimadura: Água fria 10-20 min. NÃO pasta de dentes. Cobrir com gaze
• Hipotermia: Retirar roupa molhada, aquecer gradual (mantas, bebidas mornas)
• Desidratação: Solução reidratante = 1L água + 6 c. chá açúcar + 1/2 c. chá sal
• RCP: 30 compressões + 2 insuflações. 100-120/min, 5-6 cm profundidade
• Choque: Deitar, elevar pernas, manter quente, NÃO dar comida/bebida

**EMERGÊNCIA PORTUGAL: 112**`,
  },
  {
    id: 'orientacao',
    icon: Compass,
    title: 'Orientação e Geografia Regional (Braga/Minho)',
    content: `**A — NAVEGAÇÃO SEM BÚSSOLA:**

**1. ESTRELA POLAR (noite, hemisfério Norte):**
• Localizar Ursa Major (Carro Grande) — 7 estrelas em carro
• Prolongar 5× a distância entre as 2 estrelas da "traseira" (Merak → Dubhe)
• Aponta para Estrela Polar = Norte exato

**2. RELÓGIO ANALÓGICO (dia, com sol):**
• Apontar ponteiro das HORAS ao sol
• Bissetriz entre ponteiro e o 12 = SUL

**3. MÉTODO DAS SOMBRAS:**
1. Cravar pau vertical (1m) em terreno plano
2. Marcar ponta da sombra (ponto A)
3. Esperar 15-30 min
4. Marcar nova sombra (ponto B)
5. Linha A→B = OESTE→ESTE (primeira = Oeste)
6. Norte = 90° à esquerda de A→B

**4. MUSGO NAS ÁRVORES:**
• Cresce mais no lado NORTE (menos sol, mais humidade)
• ⚠️ NÃO totalmente fiável — verificar 3+ árvores. Em floresta densa (Gerês) varia

**B — CARTOGRAFIA MENTAL DE BRAGA/MINHO:**

**EIXOS FLUVIAIS:**
• Rio Cávado: Corre Leste→Oeste (Gerês→Esposende→Atlântico). Jusante = Oeste = mar
• Rio Este: Afluente do Cávado, Braga→sudeste. Confluência em Barcelos
• Rio Homem: Afluente do Cávado, Norte→Sul (Gerês→Cávado)

**CRISTAS DAS SERRAS:**
• Serra do Gerês: ENE-OSO, pico 1548m (Nevadoira)
• Serra da Cabreira: Paralela a Gerês, mais a Sul
• Serra do Sameiro/Momente: Imediatamente a Este de Braga
• Serra de Santa Marta: Norte de Braga

**ROTAS DE EMERGÊNCIA (Braga):**
1. Nascente mais próxima: Gerês/Cabreira (Norte/Leste). Água potável
2. Hospital: Hospital de Braga (Centro). Cávado a jusante → Esposende (litoral)
3. Centro urbano: Seguir rio a jusante = sempre leva a povoação
4. Litoral/Atlântico: Cávado ou Ave a Oeste

**REGRAS REGIONAIS:**
• Montanha (Gerês/Cabreira): seguir cristas mais seguro que vales (vales = vegetação densa, rios, humidade)
• Nevoeiro litoral matinal — esperar meio-dia para orientação solar
• Trilhos de gado/veados = direção a nascentes ou passagens naturais
• Linhas elétricas (torres) = direção a povoações

**SINAIS DE SOCORRO:**
• 3 sinais (fumo, apito, lanterna) = pedido de ajuda
• SOS Morse: ··· --- ···
• Fogo em triângulo = socorro internacional
• V no chão = ajuda | X = ajuda médica`,
  },
  {
    id: 'nos',
    icon: Wrench,
    title: 'Nós Táticos Essenciais',
    content: `**NÓS TÁTICOS — TÉCNICA E APLICAÇÃO:**

**1. NÓ DE BARCAÇA (BARGE):** Juntar 2 cordames de espessura diferente
**2. NÓ DE PORCO (PIG KNOT):** Carga pesada, não escorrega sob tensão
**3. LAÇADA / BOWLINE:** Laço fixo que NÃO aperta. Resgate, amarrar trave-mestra
**4. NÓ DE FIADOR (CLOVE HITCH):** Atar a poste/árvore. Ajustável antes de carregar
**5. NÓ DE TENSÃO (TAUT-LINE):** Ajustável sob tensão. IDEAL para tendas/abrigos
**6. FIGURA 8:** Nó de parada. Não escorrega. Fácil de desfazer após carga
**7. NÓ PRUSIK:** Laço que agarra sob carga, desliza sem carga. Subir/descer corda, auto-resgate
**8. VOLTA REDONDA + 2 COTES:** Atar carga fixa. Muito fiável
**9. NÓ DE CIRURGIÃO:** Juntar cordas molhadas ou de espessura diferente
**10. NÓ DE PESCADOR:** Juntar cordas finas. Muito seguro

**APLICAÇÕES TÁTICAS:**
• Abrigo de lona: Volta do fiel + Taut-line (ajustável)
• Armadilhas: Laçada + Nó de fiador
• Descer encosta: Prusik (auto-bloqueio) + Figura 8 (parada)
• Resgate: Laçada (não corta corpo)
• Atar carga: Volta redonda + 2 cotes
• Sutura: Nó de cirurgião

**⚠️ REGRA:** Praticar antes de precisar. Nó mal feito = falha catastrófica. Testar sob carga antes de confiar.`,
  },
  {
    id: 'comunicacao',
    icon: Radio,
    title: 'Comunicação de Emergência',
    content: `**CONSERVAR BATERIA DO TELEMÓVEL:**
1. Modo avião (quando não usar)
2. Brilho mínimo
3. Desligar Wi-Fi, Bluetooth, GPS
4. Fechar apps em segundo plano
5. Desligar vibração (consome mais que toque)
6. 112 funciona sem rede própria (usa qualquer operador)

**MEIOS POR PRIORIDADE:**
1. Telemóvel — 112 (sem rede própria, sem cartão em alguns países)
2. Rádio FM/AM — receber informações oficiais
3. Walkie-talkie PMR446 — 8 canais, sem licença, 1-3km
4. Apito — 3 apitadelas = socorro. 1-2km
5. Espelho de sinal — refletir sol. 10+ km
6. Sinais de fumo — 3 fogueiras em triângulo = socorro

**FREQUÊNCIAS PORTUGAL:**
• Emergência: 112 | INEM: 112 | Bombeiros: 117
• GNR: 213 217 000 | Proteção Civil: 214 247 100
• PMR446: canais 1-8 (446.00625 a 446.09375 MHz)

**SINAIS DE FUMO:**
• 3 fogueiras em triângulo = socorro internacional
• Fumo branco = segurança | Fumo preto = perigo/urgente
• Material verde/húmido = mais fumo

**CÓDIGO MORSE SOS:**
• ··· --- ··· (3 curtos, 3 longos, 3 curtos)
• Repetir continuamente. Com lanterna, apito, ou espelho

**SINAIS VISUAIS PARA RESGATE AÉREO:**
• V = preciso de ajuda | X = ajuda médica
• N = não | Y = sim | F = comida/água
• Setas no chão = direção de deslocação`,
  },
  {
    id: 'tempo',
    icon: Cloud,
    title: 'Previsão de Tempo sem Instrumentos',
    content: `**SINAIS DE BOM TEMPO:**
• Nuvens altas finas (cirrus) — tempo estável
• Orvalho matinal — dia limpo provável
• Fumaça sobe direita — alta pressão, bom tempo
• Aves voam alto — tempo estável

**SINAIS DE TEMPESTADE:**
• Nuvens baixas escuras (cumulonimbus) — trovoada em 30-60 min
• Pressão a descer (ouvidos tapados, articulações doem)
• Animais inquietos, aves voam baixo
• Ar pesado/húmido — chuva em 6-12h
• Círculo ao redor da lua — humidade alta
• Vento muda de direção — frente a aproximar
• Cheiro a terra/vegetação forte — chuva a caminho

**REGRAS GERAIS:**
• Céu vermelho de manhã = mau tempo
• Céu vermelho ao pôr-do-sol = bom tempo
• Nuvens contra o vento = mau tempo
• Trovoada: segundos relâmpago→trovão ÷ 3 = distância em km

**PORTUGAL — PADRÕES:**
• Vento Norte/Noroeste = frio e instável
• Vento Sul/Sudoeste = quente e húmido (chuva)
• Nortada (verão, litoral) = bom tempo na costa
• Levante = vento forte de Este

**MINHO (CLIMA ATLÂNTICO):**
• Chuvas frequentes outono-inverno (1000-3000mm/ano)
• Verões curtos e amenos
• Nevoeiro matinal em vales (Gerês/Cabreira)
• Pode chover qualquer mês — SEMPRE ter abrigo pronto`,
  },
  {
    id: 'psicologico',
    icon: Brain,
    title: 'Sobrevivência Psicológica',
    content: `**A MENTE É A FERRAMENTA MAIS IMPORTANTE.** 80% das mortes em sobrevivência são por pânico/desistência, não por fatores físicos.

**REGRA DO STOP:**
S - Stop (PARAR) | T - Think (PENSAR) | O - Observe (OBSERVAR) | P - Plan (PLANEAR)

**CONTROLAR PÂNICO — TÉCNICA 4-7-8:**
1. Inspirar pelo nariz 4 segundos
2. Prender a respiração 7 segundos
3. Expirar pela boca 8 segundos
4. Repetir 4 ciclos. Reduz cardíaca e adrenalina

**MANTER A MORAL:**
1. Pequenos objetivos alcançáveis (água → abrigo → fogo)
2. Celebrar vitórias pequenas
3. Manter rotina (horas para comer, dormir, vigiar)
4. Manter higiene e aparência (dignidade = moral)
5. Escrever diário (se possível)

**COMBATER O MEDO:**
• Medo é NORMAL, não é o inimigo
• Conhecimento reduz medo (estudar antes = confiança)
• Treinar cenários mentalmente (visualização)
• Focar no PRESENTE, não no "e se"

**SINAIS DE ALERTA:**
• Apatia, desinteresse, imobilidade
• Irritabilidade extrema, agressividade
• Alucinações (falta de sono/água)
• Pensamentos negativos repetitivos
• Isolamento, recusa de comunicar

**COMBATER APATIA:**
1. Dar tarefas concretas e úteis
2. Manter ativo fisicamente
3. Estabelecer contacto social (falar, tocar)
4. Lembrar motivos para viver (família, objetivos)

**SOLIDÃO:**
• Falar alto (mesmo sozinho)
• Dar nome a objetos/animais
• Manter diário
• Imaginar conversas com entes queridos

**LEMBRETE:** A VONTADE DE VIVER é o fator mais importante. Conhecimento + calma + ação = sobrevivência.`,
  },
  {
    id: 'maritimo',
    icon: Waves,
    title: 'Sobrevivência Marítima',
    content: `**NA ÁGUA — SEQUÊNCIA:**
1. Manter a calma — pânico afunda
2. Conservar energia — NÃO nadar contra corrente
3. Flutuar de costas — braços abertos, movimentos lentos
4. Manter roupa — ajuda a flutuar e protege do frio
5. Remover só sapatos pesados

**CONTRA CORRENTE DE RETORNO (RIP CURRENT):**
1. NÃO nadar contra a corrente (exaure)
2. Nadar PARALELO à praia
3. Corrente larga a 20-50m da praia
4. Depois nadar em diagonal para terra

**HIPOTERMIA EM ÁGUA:**
• 0°C: inconsciência em 15 min, morte em 30-60 min
• 10°C: inconsciência em 30-60 min
• 15°C: inconsciência em 1-2h
• 20°C: inconsciência em 2-6h

**POSIÇÃO HELP (Heat Escape Lessening Posture):**
1. Cruzar braços sobre o peito
2. Cruzar pernas, encolher joelhos ao peito
3. Cabeça fora de água
4. Reduz perda de calor em 50%

**SINAIS DE SOCORRO NA ÁGUA:**
• Braço levantado (NÃO acenar)
• Gritar 3 vezes
• Espelho de sinal
• Roupa colorida agitada

**EM BARCO/BALSA:**
1. Recolher água da chuva (lona/vela)
2. Proteger do sol (cobrir)
3. NÃO beber água salgada (agrava desidratação)
4. NÃO beber urina (toxinas concentradas)
5. Pescar se possível
6. Manter-se agarrado
7. Ração de água: mínimo 500ml/dia`,
  },
  {
    id: 'higiene',
    icon: Wind,
    title: 'Higiene e Saneamento',
    content: `**A higiene é a PRIMEIRA defesa contra doença.** Mais mortes pós-catástrofe por doença que por ferimentos.

**MÃOS:**
• Lavar ANTES de comer, APÓS casa de banho, APÓS tocar animais/mortos
• Com água: sabão, cinzas + água (lixívia natural), ou gel alcoólico
• Sem água: esfregar com areia/terra seca, depois folhas

**CASA DE BANHO IMPROVISADA:**
1. Balde + saco do lixo: Forrar, usar, fechar e enterrar (mín. 30cm)
2. Latrina de cova: Cavar 60cm+ prof., 20m de fontes de água
3. Cobrir SEMPRE após uso (reduz moscas, cheiro, doença)
4. Papel: Folhas largas (amieiro), água, folhas de milho

**DESINFETAR:**
• Lixívia: 1:9 com água (superfícies, instrumentos)
• Cinzas + água: Lixívia natural (potassa) — sabão improvisado
• Ferver: Roupas, panos, instrumentos médicos
• Sol direto: UV desinfeta roupas/água (SODIS)

**SABÃO IMPROVISADO (CINZAS + GORDURA):**
1. Recolher cinzas de fogueira de madeira (NÃO carvão comprimido)
2. Peneirar cinzas finas
3. Misturar com água (1:3), repousar 24h → lixívia potássica
4. Aquecer gordura animal ou óleo vegetal
5. Adicionar lixívia lentamente, mexer até espessar
6. Verter em forma, secar 2-4 semanas (saponificação)

**PREVENIR DOENÇAS:**
• Água SEMPRE purificada
• Comida bem cozinhada (mín. 70°C interna)
• Frutas/legumes lavados com água purificada
• Separar cru/cozinhado (contaminação cruzada)
• Enterrar lixo orgânico (longe de água e abrigo)

**PIOLHOS E PARASITAS:**
• Pentear com pente fino (diário, 7 dias)
• Lavar roupa a 60°C+
• Vaselina no couro cabeludo (sufoca piolhos)
• Manter cabelo curto

**MICOSE/PÉ DE ATLETA:**
• Manter pés secos (trocar meias, arejar)
• Cinzas/pó de carvão nos pés (absorve humidade)
• Chá de casca de carvalho (taninos = antifúngico)`,
  },
];

