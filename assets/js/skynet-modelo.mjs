export const SKYNET_TOPICS = [
  { id: 'carreras', label: 'Carreras técnicas', words: ['carrera', 'carreras', 'especialidades', 'estudiar', 'materias', 'curricular'],
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
    links: [['notificaciones.html', 'Ver mis notificaciones'], ['comunidad.html', 'Configurar intereses']] },
  { id: 'proyectos', label: 'Proyectos estudiantiles', words: ['proyecto', 'proyectos', 'trabajos', 'estudiantes', 'galeria', 'fotos'],
    text: 'Explorá los proyectos estudiantiles publicados con revisión docente y las galerías de cada carrera. La difusión de imágenes debe tener autorización institucional.',
    links: [['novedades.html?kind=proyecto', 'Ver proyectos'], ['galeria.html', 'Galería institucional']] },
  { id: 'contacto', label: 'Contacto y privacidad', words: ['contacto', 'secretaria', 'consulta', 'direccion', 'telefono', 'privacidad', 'datos'],
    text: 'Podés enviar una consulta desde el inicio. No compartas contraseñas, salud, notas ni datos sensibles. Para corregir o eliminar información, usá los canales institucionales y revisá la política de privacidad.',
    links: [['index.html#contacto', 'Ir a contacto'], ['privacidad.html', 'Política de privacidad']] }
];
export const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const CONVERSATION = [
  { id: 'saludo', words: /^(hola|buenas|buenos dias|buenas tardes|buenas noches|que tal|como estas|como te va)[ !?]*$/,
    text: '¡Hola! Soy Skynet, tu guía de Técnica 3. ¿Cómo querés que te llame? Podés indicarme un nombre de pila o apodo en “Cómo llamarte”, o seguir sin nombre. Contame qué necesitás: carreras, materias, horarios, documentos, calendario o tu cuenta.' },
  { id: 'gracias', words: /^(muchas gracias|gracias|genial|perfecto|dale|ok|listo)$/,
    text: '¡De nada! Podemos seguir con otra consulta o profundizar en la carrera que elegiste. Si necesitás una confirmación oficial, te ayudo a encontrar el canal institucional.' },
  { id: 'despedida', words: /^(chau|adios|hasta luego|nos vemos)$/,
    text: '¡Hasta luego! Cuando vuelvas, podés retomar tu historial si autorizaste guardarlo. Recordá cerrar tu sesión si usás un equipo compartido.' },
  { id: 'identidad', words: /^(quien sos|quien eres|como te llamas|que sos|sos una ia)$/,
    text: 'Soy Skynet, un asistente institucional guiado. Reconozco temas, mantengo el contexto de la carrera y consulto publicaciones vigentes. No soy una persona ni una IA generativa: no invento requisitos, vacantes ni respuestas fuera de mis fuentes.' },
  { id: 'ayuda', words: /^(ayuda|que podes hacer|que puedes hacer|como funciona|menu)$/,
    text: 'Puedo orientarte sobre las tres carreras, continuar preguntas como “¿y sus horarios?”, buscar títulos con “buscar + palabras”, encontrar documentos y explicar cuentas y notificaciones. También podés guardar, descargar o borrar tu historial privado y elegir cómo llamarte.' }
];
export function validateNickname(value) {
  if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 40 ||
    !/^[\p{L} -]+$/u.test(value.trim()) || !/\p{L}/u.test(value)) throw new Error('Usá solo un nombre de pila o apodo de 2 a 40 letras, espacios o guiones.');
  return value.trim();
}
export function introducedName(input) {
  if (typeof input !== 'string') return null;
  const match = input.trim().match(/^(?:me llamo|mi nombre es|llamame|llámame|decime)\s+(.+)$/i);
  return match ? validateNickname(match[1]) : null;
}
export function validateQuestion(input) {
  if (typeof input !== 'string' || input.trim().length === 0 || input.length > 300) {
    throw new Error('Escribí una consulta de entre 1 y 300 caracteres, sin datos personales.');
  }
  if (/\S+@\S+\.\S+|\b\d[\d .-]{6,}\d\b|(?:mi (?:contrase[nñ]a|clave|dni)|password|token)\s*(?:es|:|=)/i.test(input)) {
    throw new Error('No envíes correos, teléfonos, documentos, contraseñas ni claves. Reformulá la consulta sin datos personales; no se guardó ni se envió.');
  }
  return input.trim();
}
export function careerContext(input, previous = '') {
  const text = ` ${normalize(input)} `;
  for (const career of ['informatica', 'madera', 'obras']) {
    const topic = SKYNET_TOPICS.find(item => item.id === career);
    if (topic.words.some(word => text.includes(` ${word} `))) return career;
  }
  return ['informatica', 'madera', 'obras'].includes(previous) ? previous : '';
}
export function skynetAnswer(input, context = '') {
  validateQuestion(input);
  const conversational = CONVERSATION.find(item => item.words.test(normalize(input)));
  if (conversational) return { id: conversational.id, text: conversational.text, links: [] };
  const text = ` ${normalize(input)} `;
  const matches = SKYNET_TOPICS.map(topic => ({ topic, score: topic.words.reduce((score, word) => score + (text.includes(` ${word} `) ? word.split(' ').length : 0), 0) }))
    .filter(match => match.score > 0).sort((a, b) => b.score - a.score ||
      Number(['horarios','documentos','proyectos'].includes(b.topic.id)) - Number(['horarios','documentos','proyectos'].includes(a.topic.id)));
  if (!matches.length && /^(buscar|busca|busqueda|encontrar)\b/.test(normalize(input))) return {
    id: 'busqueda', text: 'Voy a consultar los títulos publicados y vigentes del catálogo institucional. No se incluyen borradores ni consultas privadas.',
    links: [['novedades.html', 'Abrir catálogo completo']]
  };
  const career = careerContext(input, context);
  if (career && (matches[0]?.topic.id === 'carreras' || !matches.length && /\b(y|esa|esta|tambien)\b/.test(normalize(input)))) {
    return SKYNET_TOPICS.find(topic => topic.id === career);
  }
  if (!matches.length) return {
    id: 'sin-coincidencia',
    text: 'No tengo una respuesta verificada para esa consulta. Soy un asistente de orientación por temas, no una persona ni una IA generativa. Elegí un tema o consultá directamente a la escuela.',
    links: [['index.html#contacto', 'Consultar a la escuela']]
  };
  return matches[0].topic;
}

export function validateAnswer(answer) {
  if (!answer || typeof answer.text !== 'string' || !answer.text.length || answer.text.length > 4000 ||
    ![...SKYNET_TOPICS.map(topic => topic.id), ...CONVERSATION.map(topic => topic.id), 'sin-coincidencia', 'busqueda', 'privado'].includes(answer.id) ||
    !Array.isArray(answer.links) || answer.links.length > 8 ||
    answer.links.some(link => !Array.isArray(link) || link.length !== 2 || typeof link[0] !== 'string' ||
      link[0].length > 512 || !/^(index|informatica|madera|obras|novedades|calendario|comunidad|privacidad|notificaciones|galeria)\.html([?#][A-Za-z0-9%_=&.-]+)?$/.test(link[0]) ||
      typeof link[1] !== 'string' || !link[1].length || link[1].length > 200)) {
    throw new Error('El historial contiene una respuesta inválida. No se cargó su contenido.');
  }
  return answer;
}
