# Vértice Residence — maquete 3D (site)

Site estático em arquivo único: `index.html` + pasta `assets` (apartamento decorado).
A configuração (chave do Google, terreno, ponte, WhatsApp) fica no começo do `index.html`, no bloco `config.js`.

## Publicar (GitHub + Vercel)
Na raiz do repositório devem ficar só `index.html`, `LEIA-ME.md` e a pasta `assets`.
Na Vercel: Framework Preset "Other" e Root Directory vazio.

## Segurança da chave
Google Cloud → Credenciais → sua chave → Referenciadores HTTP: `https://SEU-DOMINIO.vercel.app/*`.

## Ponte iluminada
A posição das torres é detectada automaticamente no mapa real na primeira vez que a ponte aparece
(e fica salva no navegador). Para refazer: abra com `?ajuste=1` → "Detectar a ponte automaticamente",
ou "Voltar ao padrão" para limpar tudo.

## Ajuste do terreno (`?ajuste=1`)
1. Mover o terreno (clique no mapa) · 2. Girar a fachada · 3. Encaixar na altura do chão ·
4. Detectar a ponte. Depois "Salvar neste navegador" e envie o texto da caixa para fixar no site.
