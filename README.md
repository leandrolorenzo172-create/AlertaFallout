# Pip-Boy Terminal

Terminal de sobrevivência em estilo retro: painel, rádio FM com emissoras portuguesas, mapa de Braga, manual, alertas e assistente.

## Correr no computador

```bash
npm install
npm run dev
```

## Publicar

Cada envio para o ramo `main` compila a app e publica-a no GitHub Pages (ver `.github/workflows/pages.yml`).
Em Settings → Pages, a origem ("Source") tem de estar em "GitHub Actions".

## Notas

- O rádio só toca depois de um toque no botão "TOCA PARA LIGAR O RÁDIO" (regra dos browsers).
- Fora do claude.ai a IA não está ligada: o assistente responde com o manual incluído e os separadores Painel, Guerra, Catástrofes, Meteo e Pizza mostram erro.
- `radio-fallout-pt.html` é o rádio sozinho, num único ficheiro, gerado por `scripts/build-radio.mjs`.
