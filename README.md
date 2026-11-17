# Pip-Boy Terminal

Terminal de sobrevivência em estilo retro: painel de ameaças com o tempo em Braga, rádio com as emissoras portuguesas, música local, notícias, catástrofes, meteorologia, mapa de Braga, manual com leitor de documentos, base de conhecimento e assistente.

**Abrir a app:** https://leandrolorenzo172-create.github.io/AlertaFallout/#/dashboard

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

## Funciona sem o claude.ai

Fora do claude.ai os separadores usam dados reais de fontes públicas: meteorologia e avisos do IPMA, catástrofes do GDACS e do USGS, e notícias recolhidas de hora a hora de jornais portugueses (`scripts/fetch-news.mjs`). O Painel e o Índice Pizza são calculados a partir dessas notícias e alertas. O assistente responde com o manual incluído e com os documentos importados na base de conhecimento; a IA online só existe dentro do claude.ai.

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

- `radio-fallout-pt.html` é o rádio sozinho, num único ficheiro (com a lista de emissoras e o hls.js lá dentro), gerado por `scripts/build-radio.mjs`. Aceita links como `radio-fallout-pt.html#f=97.4`.
- `scripts/sw-template.js` é o service worker: guarda a app para abrir sem internet e nunca guarda streams de áudio nem pedidos às APIs de dados ao vivo. A versão da cache muda em cada build.
