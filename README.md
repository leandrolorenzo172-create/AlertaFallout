# SteelDeck

O painel central do Mr. Steel (rádio, alertas, jogos e ferramentas num só sítio), em estilo terminal retro: painel de ameaças com o tempo em Braga, rádio com as emissoras portuguesas, música local, notícias, catástrofes, meteorologia, mapa de Braga, manual com leitor de documentos, base de conhecimento e assistente.

**Abrir a app:** https://steeldeck.github.io/SteelDeck/#/dashboard

## Instalar no telemóvel

A app pode ser instalada como uma aplicação normal e abre sem internet (o rádio e os dados ao vivo precisam de rede).

- **Android (Chrome):** abre o endereço acima, toca no menu ⋮ e escolhe **Instalar aplicação** (ou **Adicionar ao ecrã principal**).
- **iPhone (Safari):** abre o endereço, toca em **Partilhar** e escolhe **Adicionar ao ecrã principal**.
- **Computador (Chrome/Edge):** usa o ícone de instalar na barra de endereço.

## Rádio

- **Emissoras:** as 16 principais (com endereços alternativos testados) e todas as emissoras portuguesas com stream HTTPS que respondem no diretório [radio-browser.info](https://www.radio-browser.info). A lista é recolhida por `scripts/fetch-stations.mjs` em cada publicação e de hora a hora, e gravada em `src/data/stationsPT.json`. Se a API falhar, fica a lista que está no repositório.
- **Frequências:** as principais têm frequências fixas. As restantes recebem frequências livres, primeiro na FM (pelo menos 0,6 MHz entre emissoras) e, quando a FM enche, na AM (10 kHz entre emissoras). Uma emissora que já estava na lista mantém a frequência.
- **Só HTTPS:** o site está em https e os browsers bloqueiam áudio http numa página https (conteúdo misto), por isso as emissoras só com stream http ficam de fora.
- **LISTA:** mostra todas as emissoras, com pesquisa por nome ou género. Tocar numa emissora sintoniza-a.
- **PARTILHAR:** cria um link que abre o rádio na mesma frequência, por exemplo `#/radio?f=97.4` (FM) ou `#/radio?f=1000&b=AM` (AM). Por regra dos browsers o som só começa depois de um toque, por isso o link abre com o botão "TOCA PARA OUVIR <emissora>".
- **Sem internet:** o rádio mostra "SEM SINAL — SEM LIGAÇÃO À INTERNET" e volta a ligar sozinho quando a rede regressa.
- **hls.js:** é carregado do próprio site e só quando a emissora usa HLS (`.m3u8`).

### A tocar agora

O artista e a música aparecem por baixo do nome da emissora só quando a emissora dá essa informação. Como o GitHub Pages só aloja ficheiros (não há servidor nem proxy), só se usam fontes que o browser pode ler diretamente (CORS). Atualiza de 20 em 20 segundos enquanto a emissora toca.

| Emissoras | Mostra a música? | Porquê |
|---|---|---|
| RFM, Mega Hits, Renascença, Observador e outras do StreamTheWorld | Sim (artista e música; no Observador, o programa) | A Triton publica o "now playing" com CORS em `np.tritondigital.com` |
| TSF | Sim (programa ou frase da emissora) | O servidor Icecast responde a `/status-json.xsl` com CORS |
| Outras emissoras em servidores Icecast com CORS | Sim, se o servidor publicar o título | Testado uma vez por servidor |
| Antenas da RTP | Não | Os segmentos HLS só trazem marcas de tempo (sem título nem artista); a leitura de ID3 está pronta para quando os enviarem |
| Comercial, M80, Smooth, Cidade (Bauer) | Não | O servidor não publica o estado em JSON e o título vem dentro do stream, que o browser não deixa ler |
| Nova Era, Orbital, Amália e outras em Centova | Não | Sem página de estado pública com CORS |

## Assistente (aba IA)

Conversa ao estilo Gemini/Claude, com respostas em Markdown (listas, tabelas, código), sugestões iniciais e perguntas de seguimento depois de cada resposta. O histórico fica guardado no dispositivo e pode ser lido sem rede. No topo, um indicador mostra o modo em que está:

- **🟢 Online (IA Completa):** responde em streaming com o serviço escolhido em **Definições → Assistente IA**: **Claude** (Anthropic), **ChatGPT** (OpenAI), **Gemini** (Google) ou **outro serviço compatível com a API da OpenAI** (OpenRouter, Groq, Mistral, DeepSeek, um servidor local como o Ollama...). Recebe também os excertos mais relevantes dos teus documentos, do manual e dos dados guardados da app, e cita a origem. Cada serviço precisa da chave da própria conta: fica só nesse browser, só é enviada para o serviço a que pertence e os pedidos são cobrados nessa conta. "Testar" confirma a chave e mostra os modelos disponíveis sem gastar créditos. Dentro do claude.ai usa a IA do próprio claude.ai, sem chave.
- **🟠 Offline (Base de Conhecimento Local):** sem internet, responde com um motor de pesquisa local (BM25) sobre os documentos da aba Conhecimento, o manual incluído, o núcleo do assistente e os últimos dados guardados dos separadores. Se não encontrar nada, diz que está sem rede e sugere temas que tem guardados.
- **🟡 Online sem chave:** responde com a base local e indica onde ligar a IA completa.

A rede é verificada em tempo real (eventos do browser e um pedido de teste ao próprio site a cada 30 segundos). Se a IA online falhar a meio (rede, chave recusada, limite de pedidos), a resposta vem da base local com um aviso.

## Mini Jogo: Guerra das Eras

Jogo original de defesa de base em pixel art retro, com uma só linha de combate (separador **Mini Jogo**). Funciona sem internet.

- **Visual:** pixel art de arcada 16-bit a cores. O cenário é o mapa de trincheiras desenhado pelo dono da app (redesenhado com IA, `src/game/eraWar/assets/mapa.webp`), com bunkers nas pontas. O ecrã de batalha é largo, ao formato do mapa.
- **Tropas:** são as 15 personagens da folha do dono da app (`src/game/eraWar/assets/tropas.webp`, recortes em `sprites.js`):

  | Era | Linha da frente | Atirador | Pesada |
  |---|---|---|---|
  | Primitivos | KROG | LYLA | TUSK |
  | Sucateiros | SCRAP | STALKER | ZIP |
  | Milícia | BULK | SARG | BOLT |
  | Táticas | IRON | BLAST | TINK |
  | Futurista | CRON | RAY | APEX |

  Nos botões aparecem como cartas colecionáveis cor de creme, numeradas de No.01 a No.15.
- **Animações:** As 15 personagens têm animação de andar, atacar e morrer, recortada das folhas do dono da app (`assets/anim.webp` e `anim.json`).
- **Objetivo:** destruir a base inimiga (500 HP) antes que ela destrua a tua.
- **5 eras:** Sobreviventes Primitivos, Sucateiros Medievais, Milícia Industrial, Tropas Táticas e Armadura Futurista. Cada uma tem 3 tropas (linha da frente, atiradores e pesadas: javali, cavalo de sucata, canhão a vapor, blindado, exo-armadura), uma torre e um ataque especial: chuva de destroços, barragem de morteiros, gás tóxico, bombardeamento aéreo e **Mini Nuke** (com clarão, onda de choque e tremor do ecrã).
- **Recursos:** caricas e XP ganhos a abater tropas inimigas, mais umas caricas com o tempo. As caricas compram tropas, torres e espaços para torres. O XP faz avançar de era.
- **IA:**
  - Fácil: junta caricas mais devagar e demora a evoluir.
  - Médio: equilibrado.
  - Difícil: otimiza caricas, constrói defesas e usa os especiais nos grupos de tropas.

  O equilíbrio foi afinado com partidas simuladas de IA contra IA (`src/game/eraWar/logic.js`).
- **Torres:** cada bunker tem 2 bases metálicas, uma no topo e outra no flanco. As torres são desenhos do dono da app (`assets/torres.webp`) e cada uma dispara à sua maneira:
  - Lança-pedras: pedra em arco alto, lenta e pesada, com poeira no impacto (2 de 5 vidas de um primitivo por pedra).
  - Balista: virote rápido em linha reta que fica cravado no alvo.
  - Metralhadora a vapor: rajadas que aquecem o cano e soltam vapor; se sobreaquecer, pára a arrefecer.
  - Ninho de metralhadora: tiro contínuo com dispersão e cápsulas a saltar.
  - Torre laser: carrega energia e dispara um feixe instantâneo (5 de 20 vidas de um futurista por raio).

  Cada torre tem som próprio. O alcance segue a linha vermelha marcada no mapa, igual nos dois lados.
- **Cerco:** a partir dos 10 minutos as duas bases vão perdendo vida.
- **Ecrã inteiro:** o botão no canto do ecrã de jogo põe o jogo a ocupar o ecrã todo. Na horizontal, as caricas, o XP, evoluir e o especial ficam numa lateral estreita, o campo de batalha fica grande em cima e as cartas em baixo; na vertical fica tudo empilhado.
- **Teclas:** `1` `2` `3` tropas, `Q` especial, `E` evoluir, `T` torre, `P` pausa.
- **Som 8-bit** (Web Audio, `src/game/eraWar/audio.js`, sem ficheiros):
  - tilintar de carica ao ganhar ou gastar;
  - cliques de terminal nos botões;
  - tiros, lasers e explosões;
  - sirene de alerta com a base em perigo;
  - estrondo grave da Mini Nuke;
  - música chiptune que muda com a era.

  Os botões MÚSICA e EFEITOS desligam cada parte.

## Mini Jogo: Patrulha Estelar e Cobra (ecrã LCD retro)

Dois jogos simples no separador **Mini Jogo**, num ecrã LCD de 84×48 píxeis a preto sobre verde, com moldura nas cores do tema e um comando no ecrã (`src/game/lcd/`). No separador, cada cartão mostra o jogo a jogar sozinho:

- **Patrulha Estelar:** nave de rolagem lateral, vagas de inimigos, montanhas com padrão quadriculado, corações de vida, laser especial e bónus. Tem 10 níveis, cada um acabado por um chefe diferente e mais difícil do que o anterior:
  1. Sentinela;
  2. Medusa;
  3. Nave-Mãe;
  4. Caranguejo;
  5. Escaravelho, que faz investidas;
  6. Serpente, que se move em oito e dispara balas em onda;
  7. Fortaleza, que lança drones;
  8. Vespa, rápida e imprevisível;
  9. Olho Laser, com um raio anunciado;
  10. Núcleo, que mistura todos os ataques.

  Os dois últimos ficam mais rápidos com metade da vida. Cada chefe vencido dá uma vida e um laser. Depois do 10.º aparece o ecrã de vitória com a pontuação e A para recomeçar.
- **Cobra:** o clássico da cobrinha, com 9 níveis de velocidade e um bicho de bónus com contagem. Bater nas paredes ou no corpo acaba o jogo.
- Os recordes ficam guardados no aparelho.
- **Música chiptune** feita com o mesmo sintetizador 8-bit da Guerra das Eras:
  - Patrulha Estelar: tema espacial rápido que acelera a cada nível e fica tenso nos chefes;
  - Cobra: melodia saltitante que acelera com a cobra;
  - pára na pausa, e o botão SOM desliga a música e os bips.
- **Controlos:**
  - telemóvel: analógico à esquerda; botões à direita (Patrulha: A dispara, B laser; Cobra: A pausa, B som); SAIR, PAUSA e SOM ao centro; na cobra também dá para deslizar o dedo no ecrã;
  - PC: setas/WASD, espaço, X, P, Esc, M para o som (o comando também funciona com o rato).
- **Ficheiro único:** `npm run build` gera também `arcade/mini-arcade-retro.html` (publicado em `arcade.html`), um só HTML com CSS e JavaScript embutidos e os 3 jogos (Patrulha Estelar, Cobra e Guerra das Eras). Abre-se diretamente no browser, sem internet.

## Funciona sem o claude.ai

Fora do claude.ai os separadores usam dados reais de fontes públicas: meteorologia e avisos do IPMA, catástrofes do GDACS e do USGS, e notícias recolhidas de hora a hora de jornais portugueses (`scripts/fetch-news.mjs`). O Painel e o Índice Pizza são calculados a partir dessas notícias e alertas. O assistente responde com a base local ou, com uma chave da API guardada nas Definições, com a IA completa (ver acima).

## Correr no computador

```bash
npm install
npm run dev
```

Para testar a versão de produção (com o service worker):

```bash
npm run build
npm run preview
```

## Publicar

Cada envio para o ramo `main` compila a app e publica-a no GitHub Pages (ver `.github/workflows/pages.yml`). O mesmo workflow corre de hora a hora para atualizar as notícias e as emissoras. Em Settings → Pages, a origem ("Source") tem de estar em "GitHub Actions".

## Ficheiros

- `radio-steeldeck.html` é o rádio sozinho, num único ficheiro (com a lista de emissoras e o hls.js lá dentro), gerado por `scripts/build-radio.mjs`. Aceita links como `radio-steeldeck.html#f=97.4`.
- `scripts/sw-template.js` é o service worker: guarda a app para abrir sem internet e nunca guarda streams de áudio nem pedidos às APIs de dados ao vivo. A versão da cache muda em cada build.

## Notificações automáticas (registo dos telemóveis)

- Na app, **Definições → Notificações → "Ativar notificações no telemóvel"**: o telemóvel regista-se sozinho, sem códigos.
- O registo é guardado num serviço pequeno na Cloudflare (`worker/push-registry.js`, Worker `steeldeck-push` com KV `steeldeck-push-subs`,
  em `https://steeldeck-push.steeldeck.workers.dev`). Guarda só o endereço de envio do browser, os interruptores e a cor de cada telemóvel.
- O GitHub Actions (`scripts/send-push.mjs`) lê a lista com um JWT assinado pela chave VAPID privada (secret `VAPID_PRIVATE_KEY`) — não há segredos novos —,
  envia a cada telemóvel só as categorias ligadas e apaga os registos que deixaram de existir.
- Para voltar a publicar o Worker: API da Cloudflare `PUT /accounts/{conta}/workers/scripts/steeldeck-push` com o ficheiro e as ligações
  `SUBS` (KV), `VAPID_PUBLIC` e `ALLOWED_ORIGINS=https://steeldeck.github.io`.

## Idiomas (Português e English)

- Em **Definições → Idioma** escolhe-se **Português (PT)** ou **English (US)**; sem escolha, segue o idioma do telemóvel.
- Os textos estão em português no código e passam por `t('texto')` (`src/i18n/index.js`); as traduções inglesas estão em `src/i18n/en.js`
  (chave = texto em português). Se faltar uma tradução, aparece o português.
- As notificações push também saem no idioma de cada telemóvel (o idioma vai no registo automático).
- Ficam em português: títulos das notícias (jornais portugueses), textos livres dos avisos do IPMA e, por agora, o Manual.
