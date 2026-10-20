export const SKYNET_TOPICS = [
  { id: 'carreras', label: 'Carreras técnicas', words: ['carrera', 'carreras', 'especialidades', 'estudiar'],
    text: 'La escuela presenta tres especialidades técnicas. Cada página incluye enfoque, objetivos y estructura curricular de 4.º a 7.º. Consultá allí las fuentes y materias.',
    links: [['informatica.html', 'Informática Personal y Profesional'], ['madera.html', 'Industrialización de la Madera y el Mueble'], ['obras.html', 'Maestro Mayor de Obras']] },
  { id: 'informatica', label: 'Informática', words: ['informatica', 'computacion', 'programacion', 'software'],
    text: 'Informática Personal y Profesional cuenta con una página propia con enfoque, objetivos y materias del diseño curricular aportado. Los horarios y docentes deben estar confirmados por la institución.',
    links: [['informatica.html', 'Ver Informática'], ['novedades.html?kind=horario&career=informatica', 'Horarios publicados']] },
  { id: 'madera', label: 'Madera y Mueble', words: ['madera', 'mueble', 'carpinteria'],
    text: 'Industrialización de la Madera y el Mueble tiene una página con su propuesta curricular y galería de trabajos del taller.',
    links: [['madera.html', 'Ver Madera y Mueble']] },
  { id: 'obras', label: 'Maestro Mayor de Obras', words: ['obras', 'construccion', 'maestro mayor'],
    text: 'Maestro Mayor de Obras presenta su enfoque, objetivos y materias de 4.º a 7.º en una página independiente.',
    links: [['obras.html', 'Ver Maestro Mayor de Obras']] },
  { id: 'inscripciones', label: 'Inscripciones', words: ['inscripcion', 'inscripciones', 'inscribirme', 'vacante', 'vacantes', 'matricula', 'anotarme', 'requisitos'],
    text: 'No confirmo vacantes, fechas ni requisitos que no estén publicados. Consultá los comunicados vigentes o enviá una consulta a Secretaría. El formulario de contacto no equivale a una inscripción.',
    links: [['novedades.html', 'Consultar comunicados'], ['index.html#contacto', 'Contactar a la escuela']] },
  { id: 'calendario', label: 'Calendario y fechas', words: ['calendario', 'fecha', 'fechas', 'feriado', 'eventos', 'agenda', '2027', '2026'],
    text: 'El calendario permite elegir el ciclo lectivo y descargar las fechas cargadas como .ics. Un año vacío no implica ausencia de clases: significa que todavía no se cargó su agenda. Confirmá actividades con la escuela.',
    links: [['calendario.html', 'Abrir calendario']] },
  { id: 'cuenta', label: 'Cuenta y contraseña', words: ['cuenta', 'login', 'registro', 'registrarme', 'contrasena', 'recuperacion', 'acceso', 'administrador'],
    text: 'Desde Comunidad podés crear una cuenta o recuperar la contraseña. Alumnos y profesores requieren aprobación para permisos institucionales. Administración se asigna privadamente; Skynet no cambia cuentas ni solicita contraseñas.',
    links: [['comunidad.html', 'Entrar a Comunidad'], ['comunidad.html#recuperar', 'Recuperar contraseña']] },
  { id: 'documentos', label: 'Documentos', words: ['documento', 'documentos', 'formulario', 'formularios', 'pdf', 'descargar'],
    text: 'El catálogo reúne documentos y formularios públicos autorizados. Revisá fecha, versión y vigencia. No envíes DNI, firmas o documentación sensible a este asistente.',
    links: [['novedades.html?kind=documento', 'Ver documentos']] },
  { id: 'horarios', label: 'Horarios y docentes', words: ['horario', 'horarios', 'profesor', 'profesores', 'docente', 'turno'],
    text: 'Los horarios y el equipo docente deben ser publicados y confirmados por la escuela. Si el catálogo no tiene información vigente, consultá a Secretaría: no voy a inventar nombres ni horarios.',
    links: [['novedades.html?kind=horario', 'Ver horarios publicados'], ['index.html#contacto', 'Consultar a Secretaría']] },
  { id: 'notificaciones', label: 'Notificaciones', words: ['notificacion', 'notificaciones', 'avisos', 'campana'],
    text: 'Las notificaciones internas se consultan con tu sesión en Comunidad, según tus intereses. Podés desactivarlas allí. No se solicita permiso del navegador ni se envían campañas de correo automáticamente.',
    links: [['comunidad.html', 'Abrir mi cuenta']] },
  { id: 'proyectos', label: 'Proyectos estudiantiles', words: ['proyecto', 'proyectos', 'trabajos', 'estudiantes', 'galeria', 'fotos'],
    text: 'Explorá los proyectos estudiantiles publicados con revisión docente y las galerías de cada carrera. La difusión de imágenes debe tener autorización institucional.',
    links: [['novedades.html?kind=proyecto', 'Ver proyectos'], ['galeria.html', 'Galería institucional']] },
  { id: 'contacto', label: 'Contacto y privacidad', words: ['contacto', 'secretaria', 'consulta', 'direccion', 'telefono', 'privacidad', 'datos'],
    text: 'Podés enviar una consulta desde el inicio. No compartas contraseñas, salud, notas ni datos sensibles. Para corregir o eliminar información, usá los canales institucionales y revisá la política de privacidad.',
    links: [['index.html#contacto', 'Ir a contacto'], ['privacidad.html', 'Política de privacidad']] }
];
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export function skynetAnswer(input) {
  if (typeof input !== 'string' || input.trim().length === 0 || input.length > 300) {
    throw new Error('Escribí una consulta de entre 1 y 300 caracteres, sin datos personales.');
  }
  const text = ` ${normalize(input)} `;
  const matches = SKYNET_TOPICS.map(topic => ({ topic, score: topic.words.reduce((score, word) => score + (text.includes(` ${word} `) ? word.split(' ').length : 0), 0) }))
    .filter(match => match.score > 0).sort((a, b) => b.score - a.score);
  if (!matches.length) return {
    id: 'sin-coincidencia',
    text: 'No tengo una respuesta verificada para esa consulta. Soy un asistente de orientación por temas, no una persona ni una IA generativa. Elegí un tema o consultá directamente a la escuela.',
    links: [['index.html#contacto', 'Consultar a la escuela']]
  };
  return matches[0].topic;
}
