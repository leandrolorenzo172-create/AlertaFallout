# Pasta do Mr. Steel — fórmula e frases

Tudo o que define **como o Mr. Steel fala** está aqui, em ficheiros simples que podes editar diretamente no GitHub (lápis ✏️ no canto do ficheiro → editar → "Commit changes"). A app volta a ser publicada sozinha e passa a usar o texto novo.

| Ficheiro | Para que serve | Usado por |
|---|---|---|
| `formula.md` | A fórmula de resposta (saudação, conversa de café, resposta com fonte, pergunta fora dos ficheiros, pedido pouco claro) e as regras de ouro | IA online (vai no pedido à IA) e modo offline (segue a mesma fórmula) |
| `formula-resumo.md` | **Base obrigatória** quando pedes informação: consultar primeiro a base de conhecimento e escrever um resumo de 10–15 linhas (porquê/contexto → critérios e local → opções práticas → avisos de segurança) | IA online (vai no pedido, à risca) e offline (o motor monta os 4 blocos a partir de qualquer documento da aba Conhecimento) |
| `respostas.json` | 100 aberturas curtas antes de uma resposta ("Fui ver ao Guia.") | Offline, antes de "Com base no ficheiro…"; online, como exemplos de estilo |
| `perguntas.json` | 100 perguntas de seguimento no fim das respostas | Offline e exemplos online |
| `iniciar.json` | 100 formas de iniciar ou retomar conversa | Offline (depois de cumprimentar, quando a conversa está parada) e exemplos online |
| `piadas.json` | 100 piadas leves, usadas quando pedes "conta uma piada", "anedota", "faz-me rir" ou "conta outra" | Offline (nunca repete a última); online, a IA recebe uma como sugestão |
| `resumos.json` | Resumos em prosa do Guia: 18 por capítulo (abrigo, água, fogo…) e 34 por palavra-chave (lixívia, pederneira, hipotermia, torniquete, RCP, víbora…). Cada um tem `chaves` (palavras que o ativam, sem acentos), `capitulo` e `texto` | Offline: "abrigo" ou "fala-me de hipotermia" dá o resumo com o ficheiro e as páginas do PDF; online, vai como modelo de resposta |
| `conversa.json` | Conversa de café: 20 temas (tudo bem, cansaço, tempo, futebol, café, piadas…), cada um com as palavras que o ativam e 5 respostas (100 no total) | Offline; online serve de exemplo de tom |

## Regras para editar
- Mantém o formato JSON: cada frase entre aspas `"..."` e separada por vírgula. Se o ficheiro ficar inválido, a publicação falha e o site continua com a versão anterior (vês o erro no separador Actions do GitHub).
- Em `conversa.json`, as palavras de `padroes` escrevem-se **sem acentos e em minúsculas** ("cansaco", "cafe").
- Português de Portugal, a tratar por "tu". Evita clichés ("boa pergunta", "claro!") e emojis nas respostas sérias.
- Podes acrescentar mais frases do que 100: o Mr. Steel escolhe ao acaso e nunca repete a última.
