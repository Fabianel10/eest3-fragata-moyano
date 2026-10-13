import { readFile, writeFile } from 'node:fs/promises';
import { planes } from './carreras-datos.mjs';

const root = new URL('../', import.meta.url);
const gallery = await readFile(new URL('galeria.html', root), 'utf8');
const home = await readFile(new URL('index.html', root), 'utf8');
const part = (source, start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`No se encontró el componente ${start}`);
  return source.slice(from, to + end.length);
};
const weather = part(gallery, '<aside class="clima-compacto"', '</aside>');
const player = part(gallery, '<section class="reproductor-musica"', '</section>');
const slider = part(gallery, '<section class="slider-galeria"', '</section>');
const footer = part(gallery, '<footer>', '</footer>');
const header = part(home, '<header>', '</header>').replaceAll('href="#', 'href="index.html#')
  .replaceAll('class="active"', '').replaceAll('aria-current="page"', '');
const careers = [
  { slug: 'informatica', title: 'Informática Personal y Profesional', label: 'Tecnología que conecta',
    focus: 'Comprender, desarrollar y mantener soluciones informáticas para las personas y las organizaciones.',
    goals: ['Resolver problemas mediante programación y pensamiento lógico.', 'Explorar equipos, redes y sistemas con criterios de seguridad.', 'Construir proyectos colaborativos y documentar soluciones.'],
    image: 'assets/images/IMG-20260917-WA0151.jpg' },
  { slug: 'madera', title: 'Industrialización de la Madera y el Mueble', label: 'Diseñar. Transformar. Crear.',
    focus: 'Explorar el diseño y la producción de objetos y muebles, vinculando materiales, procesos y uso responsable de recursos.',
    goals: ['Relacionar diseño, funcionalidad y propiedades de los materiales.', 'Abordar procesos de fabricación y organización del trabajo.', 'Promover calidad, seguridad en el taller y aprovechamiento responsable de la madera.'],
    image: 'assets/images/ecuela.jpg' },
  { slug: 'obras', title: 'Maestro Mayor de Obras', label: 'Ideas que se construyen',
    focus: 'Acercarse al proyecto y la construcción de espacios, integrando representación, materiales y organización de obras.',
    goals: ['Interpretar y comunicar propuestas mediante documentación técnica.', 'Comprender materiales, instalaciones y procesos constructivos.', 'Trabajar con criterios de seguridad, accesibilidad y responsabilidad ambiental.'],
    image: 'assets/images/IMG-20260917-WA0151.jpg' }
];
for (const c of careers) {
  const plan = planes[c.slug];
  c.focus = plan.focus;
  c.goals = plan.goals;
  const head = part(gallery, '<head>', '</head>')
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${c.title} | EEST N°3 Fragata Moyano</title>`)
    .replace(/name="description"[\s\S]*?content="[^"]*"/, `name="description" content="${c.focus}"`)
    .replace('</head>', '<link rel="stylesheet" href="assets/css/carreras.css" /></head>');
  const years = plan.years.map(y => {
    const total = y.groups.flatMap(group=>group.subjects).reduce((sum,[,hours])=>sum+hours,0);
    const groups = y.groups.map(group => `<div class="carrera-materias"><h4>${group.label}</h4><table><caption>${group.label} · ${y.number}.º año</caption><thead><tr><th scope="col">Materia / espacio curricular</th><th scope="col">Horas reloj anuales</th></tr></thead><tbody>${group.subjects.map(([name,hours])=>`<tr><th scope="row">${name}</th><td>${hours}</td></tr>`).join('')}</tbody></table></div>`).join('');
    return `<section class="carrera-seccion carrera-anio" id="anio-${y.number}"><p class="eyebrow">Ciclo superior</p><h3>${y.number}.º año</h3><p>Total del año: ${total.toLocaleString('es-AR')} horas reloj, incluidas las prácticas cuando corresponden.</p><details open><summary>Ver materias de ${y.number}.º año</summary>${groups}</details></section>`;
  }).join('\n');
  const html = `<!doctype html>
<html lang="es">${head}
<body class="carrera-pagina carrera-${c.slug}">
<a class="saltar-contenido" href="#contenido-principal">Saltar al contenido principal</a>
${header}
<main id="contenido-principal">
<section class="carrera-hero"><div><p class="eyebrow">Formación técnica · San Fernando</p><h2>${c.title}</h2><p>${c.label}</p><a class="btn-principal" href="#trayectoria">Explorar la trayectoria ↓</a></div><img src="${c.image}" alt="Imagen institucional de la escuela; no identifica un taller específico." /></section>
<section class="carrera-seccion" id="enfoque"><p class="eyebrow">La propuesta</p><h2>Enfoque de la carrera</h2><p>${c.focus}</p><p class="carrera-aviso">Síntesis orientativa del diseño curricular aportado. No sustituye el documento completo ni acredita incumbencias, matrícula o habilitación profesional. La institución debe confirmar su aplicación y vigencia.</p></section>
<section class="carrera-seccion"><p class="eyebrow">Aprender haciendo</p><h2>Objetivos de formación</h2><ul class="carrera-objetivos">${c.goals.map(g=>`<li>${g}</li>`).join('')}</ul></section>
<section class="carrera-seccion" id="diseno-curricular"><p class="eyebrow">Plan de estudios</p><h2>Diseño curricular</h2><p>${plan.summary}</p><p><strong>Fuente:</strong> ${plan.source}. Provincia de Buenos Aires, DGCyE. ${plan.reference}.</p><p>Documento aportado: ${plan.document}. ${plan.pages}</p><p>Total del ciclo superior: ${plan.total.toLocaleString('es-AR')} horas reloj. Se presenta una síntesis y la estructura de materias; el PDF íntegro no se aloja en este sitio.</p><a href="index.html#contacto">Consultar a Secretaría sobre el plan vigente →</a></section>
<section class="carrera-seccion" id="trayectoria"><p class="eyebrow">De 4.º a 7.º</p><h2>Tu recorrido en el ciclo superior</h2><p>Materias y horas reloj anuales según la tabla curricular del documento aportado. No son horarios de clases ni horas módulo. Las divisiones, turnos y docentes se informarán por separado.</p><nav class="sitio-carreras" aria-label="Años de la carrera">${[4,5,6,7].map(y=>`<a href="#anio-${y}">${y}.º año</a>`).join('')}</nav></section>
${years}
<section class="carrera-seccion"><p class="eyebrow">Organización académica</p><h2>Horarios y equipo docente</h2><div class="carrera-anios"><article class="carrera-anio"><h3>Horarios</h3><p>Próximamente: horarios por año, división y turno, con fecha de actualización.</p></article><article class="carrera-anio"><h3>Profesores/as a cargo</h3><p>Próximamente: equipo docente y canales institucionales autorizados. No se publicarán datos de contacto personales.</p></article></div></section>
<section class="carrera-seccion galeria-pagina"><p class="eyebrow">Proyectos y experiencias</p><h2>Imágenes y videos</h2><p>${c.slug === 'madera' ? 'Conocé el taller de Industrialización de la Madera y el Mueble: bancos, herramientas, equipos y piezas en elaboración. Cinco fotografías aportadas para esta entrega, con difusión autorizada.' : 'Recorrido institucional de referencia. Los proyectos específicos de esta carrera se incorporarán cuando estén identificados y autorizados para difusión.'}</p>${slider}</section>
<section class="carrera-seccion"><h2>Seguí conectado/a</h2><p>Consultá la agenda o sumate a la comunidad para guardar tus intereses.</p><a class="btn-principal" href="calendario.html">Calendario 2026</a> <a href="comunidad.html">Mi comunidad →</a>${weather}${player}</section>
</main>${footer}
<script src="assets/js/comunidad-config.js?v=20261006-1"></script>
<script type="module" src="assets/js/cms-publico.mjs?v=20261006-carreras"></script>
</body></html>`;
  await writeFile(new URL(`${c.slug}.html`, root), html);
}
await writeFile(new URL('assets/cms/componentes.json', root), JSON.stringify({ weather, player, footer }, null, 2) + '\n');
console.log('Tres páginas y componentes compartidos generados.');
