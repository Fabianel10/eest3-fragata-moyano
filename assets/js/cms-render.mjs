import { validarDocumento } from './cms-modelo.mjs';

export function prepararRenderer(catalogo, root = document) {
  const originales = new Map();
  const referencias = new Map();
  function capturar(descriptores) {
    for (const [id, desc] of Object.entries(descriptores)) {
      const element = root.querySelector(desc.selector);
      if (!element) throw new Error(`El catálogo no coincide con la página (${id}). Regeneralo antes de publicar.`);
      const node = desc.kind === 'text' ? element.childNodes[desc.textIndex] : element;
      if (!node || desc.kind === 'text' && node.nodeType !== 3) throw new Error(`Campo desactualizado: ${id}.`);
      referencias.set(id, {
        node, element, desc,
        prefix: desc.kind === 'text' ? node.nodeValue.match(/^\s*/)[0] : '',
        suffix: desc.kind === 'text' ? node.nodeValue.match(/\s*$/)[0] : '',
        background: desc.kind === 'background' ? root.defaultView.getComputedStyle(element).backgroundImage : ''
      });
    }
  }
  capturar(catalogo.descriptors.chrome);
  for (const [source, desc] of Object.entries(catalogo.descriptors.blocks)) {
    const section = root.querySelector(desc.selector);
    if (!section) throw new Error('Falta una sección de la plantilla original.');
    originales.set(source, section);
    capturar(desc.fields);
  }
  function escribir(fields) {
    for (const [id, field] of Object.entries(fields)) {
      const ref = referencias.get(id);
      if (!ref) continue;
      if (field.kind !== ref.desc.kind) throw new Error(`Tipo de campo incompatible: ${id}.`);
      if (field.kind === 'text') ref.node.nodeValue = `${ref.prefix}${field.value}${ref.suffix}`;
      if (field.kind === 'image') {
        ref.element.setAttribute('src', field.value);
        ref.element.setAttribute('alt', field.alt);
      }
      if (field.kind === 'link') ref.element.setAttribute('href', field.value);
      if (field.kind === 'background') {
        const image = field.value ? `url("${field.value}")` : 'none';
        ref.element.style.backgroundImage = ref.background.includes('url(')
          ? ref.background.replace(/url\((?:"[^"]*"|'[^']*'|[^)]*)\)/g, image)
          : image;
      }
    }
  }
  return (content) => {
    validarDocumento(content);
    for (const block of content.blocks) {
      if (block.kind === 'original' && !originales.has(block.source)) throw new Error('La página contiene una plantilla desconocida.');
    }
    const main = root.querySelector('main');
    root.querySelectorAll('[data-cms-custom]').forEach((node) => node.remove());
    root.title = content.title;
    root.querySelector('meta[name="description"]')?.setAttribute('content', content.description);
    escribir({ ...catalogo.defaults.chrome, ...content.chrome });
    originales.forEach((node) => { node.dataset.cmsHidden = 'true'; });
    for (const block of content.blocks) {
      if (block.kind === 'original') {
        const node = originales.get(block.source);
        const base = catalogo.defaults.blocks.find((b) => b.source === block.source);
        if (!node || !base) throw new Error('La página contiene una plantilla desconocida.');
        escribir({ ...base.fields, ...block.fields });
        node.dataset.cmsHidden = String(block.hidden);
        node.dataset.cmsTheme = block.theme;
        main.append(node);
      } else {
        const node = construirBloque(block, root);
        node.dataset.cmsCustom = block.id;
        node.dataset.cmsHidden = String(block.hidden);
        main.append(node);
      }
    }
    return content.modules;
  };
}

function construirBloque(block, root) {
  const crear = (tag, value, clase) => {
    const node = root.createElement(tag);
    if (value) node.textContent = value;
    if (clase) node.className = clase;
    return node;
  };
  const section = crear('section', '', `cms-section cms-${block.kind}`);
  section.dataset.cmsTheme = block.theme;
  section.dataset.cmsLayout = block.layout;
  const value = (key, fields = block.fields) => fields[key]?.value || '';
  const agregarImagen = (parent, fields) => {
    if (!value('image', fields)) return;
    const img = crear('img');
    img.src = value('image', fields);
    img.alt = fields.image.alt;
    img.loading = 'lazy';
    parent.append(img);
  };
  const agregarEnlace = (parent, fields) => {
    if (!value('link', fields)) return;
    const link = crear('a', value('linkText', fields) || 'Ver más', 'btn-principal');
    link.href = value('link', fields);
    parent.append(link);
  };
  const texto = crear('div', '', 'cms-section-copy');
  texto.append(crear('p', value('kicker'), 'eyebrow'), crear('h2', value('title')), crear('p', value('body'), 'cms-body'));
  section.append(texto);
  if (block.kind === 'imagen') agregarImagen(section, block.fields);
  if (block.kind === 'llamada') agregarEnlace(texto, block.fields);
  if (block.kind === 'tarjetas') {
    const cards = crear('div', '', 'cms-cards');
    for (const fields of block.cards) {
      const card = crear('article', '', 'cms-card');
      agregarImagen(card, fields);
      card.append(crear('h3', value('title', fields)), crear('p', value('body', fields), 'cms-body'));
      agregarEnlace(card, fields);
      cards.append(card);
    }
    section.append(cards);
  }
  return section;
}
