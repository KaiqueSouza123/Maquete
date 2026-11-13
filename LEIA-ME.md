# Vértice Residence — como publicar

Estrutura (mantenha exatamente assim na raiz do repositório):

    index.html            ← site cinematográfico (tela única)
    assets/               ← 5 vídeos + 5 imagens de capa
    maquete/index.html    ← maquete 3D interativa
    maquete/assets/apartamento.glb

1. No GitHub, abra o repositório KaiqueSouza123/Maquete → Add file → Upload files.
2. Arraste o CONTEÚDO desta pasta (não a pasta em si). Substitua o index.html antigo.
3. Commit. A Vercel publica sozinha em ~1 minuto.

Como funciona:
- A abertura toca e emenda na vista geral, que fica em loop contínuo.
- Pontos clicáveis no vídeo: Lazer, Torre A, Torre B e Ponte (liga o modo noite).
- Botão Noite/Dia troca a vista geral com transição suave.
- "Escolha seu andar": régua 1–15 à esquerda; o vídeo sobe pela fachada até o andar.
  Também funciona com a rodinha do mouse e as setas ↑ ↓.
- WhatsApp: troque o número na linha `var WHATS = '5548999990000';` do index.html.
