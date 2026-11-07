/* Configuração da maquete — edite aqui */
window.MAQUETE_CONFIG = {
  /* Chave da Google Map Tiles API. Depois de publicar, restrinja a chave ao domínio do site no Google Cloud. */
  googleKey: 'AIzaSyBBPe9fziROa7BwNoYY6cZoLDzCIndPGSw',
  tilesUrl: 'https://tile.googleapis.com/v1/3dtiles/root.json',

  /* Terreno (centro do lote). heading = azimute da fachada principal, em graus (0 = norte, 90 = leste). */
  site: { lat: -27.5905, lon: -48.5728, h: 3, heading: 113, autoGround: true },

  /* Ponte Hercílio Luz: centro aproximado e direção do eixo. Use o modo de ajuste (?ajuste=1) para marcar o topo das torres. */
  bridge: { lat: -27.5935, lon: -48.5649, heading: 62 },

  /* WhatsApp que recebe as propostas (somente números, com DDI e DDD) */
  whatsapp: '5548999990000',

  /* Apartamento decorado (glTF/GLB) */
  aptUrl: 'assets/apartamento.glb'
};
