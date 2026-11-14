# Vértice Residence — como publicar

Estrutura (mantenha exatamente assim na raiz do repositório):

    index.html            ← site cinematográfico (vídeos novos do Flow, 1080p)
    assets/               ← vídeos 1080p (computador) + _m 720p (celular), capas e som do mar
    maquete/index.html    ← maquete 3D (abre de frente para as torres, ponte atrás e clicável)
    maquete/assets/apartamento.glb

1. GitHub → repositório KaiqueSouza123/Maquete → Add file → Upload files.
2. Arraste o CONTEÚDO desta pasta (não a pasta em si). Substitua os arquivos antigos.
   Os vídeos antigos da pasta assets (home_dia, home_noite...) podem ser apagados.
3. Commit. A Vercel publica sozinha em ~1 minuto.

O site escolhe sozinho a versão 720p no celular (mais leve) e 1080p no computador.
WhatsApp: troque o número na linha `var WHATS = '5548999990000';` do index.html.
