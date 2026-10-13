const general = {
  4: ['Literatura', 'Inglés', 'Educación Física', 'Salud y Adolescencia', 'Historia', 'Geografía'],
  5: ['Literatura', 'Inglés', 'Educación Física', 'Política y Ciudadanía', 'Historia', 'Geografía'],
  6: ['Literatura', 'Inglés', 'Educación Física', 'Filosofía', 'Arte']
};
const fg = year => general[year].map(name => [name, 72]);
const grupo = (label, subjects) => ({ label, subjects });
const year = (number, groups) => ({ number, groups });
const g = subjects => grupo('Formación general', subjects);
const c = subjects => grupo('Formación científico-tecnológica', subjects);
const t = subjects => grupo('Formación técnica específica', subjects);
const p = name => grupo('Prácticas profesionalizantes', [[name, 216]]);

export const planes = {
  informatica: {
    source: 'Diseño curricular Técnico en Informática Personal y Profesional',
    document: 'informatica_personal_y_profesional.pdf',
    reference: 'IF-2018-31698000-GDEBA-DETECDGCYE',
    pages: 'Perfil: páginas 2–7. Estructura curricular: página 9.',
    total: 4752,
    summary: 'El diseño articula formación general, científico-tecnológica y técnica específica. En séptimo año integra prácticas profesionalizantes del sector informático, proyecto integrador y mantenimiento de sistemas y redes.',
    focus: 'Formación para acompañar a usuarios de tecnología: instalar y mantener equipos, sistemas y redes, proteger la información, resolver problemas y desarrollar soluciones informáticas.',
    goals: ['Asistir y capacitar a usuarios en el uso de herramientas y servicios informáticos.', 'Instalar, configurar y mantener equipos y redes, cuidando la integridad de los datos.', 'Desarrollar y adaptar soluciones, documentar el trabajo y participar en proyectos y servicios informáticos.'],
    years: [
      year(4, [g(fg(4)), c([['Matemática Ciclo Superior',144],['Física',108],['Química',72],['Tecnologías Electrónicas',72]]),
        t([['Lenguajes de Programación I',72],['Hardware Equipo Monousuario',144],['Introducción a los Sistemas Operativos',144],['Suite de Aplicaciones',72]])]),
      year(5, [g(fg(5)), c([['Análisis Matemático',144],['Sistemas Digitales',108],['Teleinformática',144]]),
        t([['Lenguajes de Programación II',72],['Hardware de Red',144],['Sistemas Operativos Mono y Multiusuario',144],['Arquitectura de Datos',72]])]),
      year(6, [g(fg(6)), c([['Matemática Aplicada',72],['Sistemas Digitales',108],['Investigación Operativa',108],['Seguridad Informática',108],['Derechos del Trabajo',72]]),
        t([['Diseño de Programas',72],['Diseño y Hardware de Redes Locales y WAN',144],['Sistemas Operativos Multiplataforma',144],['Diseño de APP',72]])]),
      year(7, [p('Prácticas Profesionalizantes del Sector Informático'),
        c([['Emprendimientos e Innovación Productiva',72],['Evaluación de Proyectos',72],['Modelos y Sistemas',72],['Base de Datos',108]]),
        t([['Proyecto Integrador',144],['Instalación, Mantenimiento y Reparación de Sistemas Computacionales',144],['Instalación, Mantenimiento y Reparación de Redes Informáticas',144]])])
    ]
  },
  madera: {
    source: 'Diseño curricular de la Tecnicatura en Industrialización de la Madera y el Mueble',
    document: 'Madera y Mueble diseño curricular.pdf',
    reference: 'DGCyE · Resolución 2254/15 · Expediente 5801-0431514/15',
    pages: 'Resolución: páginas 1–3 del PDF. Perfil: páginas 5–6. Estructura curricular: página 7.',
    total: 4536,
    summary: 'La formación combina diseño de mobiliario, elaboración de productos de carpintería y gestión de procesos y emprendimientos. El ciclo superior reúne 4.536 horas reloj; séptimo incluye prácticas profesionalizantes del sector.',
    focus: 'Formación para diseñar y producir muebles y elementos de carpintería, seleccionar materiales, operar y mantener equipos e instalar productos, integrando calidad, seguridad y cuidado ambiental.',
    goals: ['Proyectar mobiliario que combine función, ergonomía, estética y viabilidad técnica.', 'Organizar la fabricación, el ensamble, el acabado y la instalación con uso responsable de materiales.', 'Gestionar procesos productivos y emprendimientos, con seguridad en el trabajo y mantenimiento de equipos.'],
    years: [
      year(4, [g([...fg(4),['Filosofía',72]]),
        c([['Matemática-Ciclo Superior',108],['Física',108],['Química',72],['Tecnología de la Representación',72]]),
        t([['Tecnología de Control',144],['Diseño y Fabricación',144]])]),
      year(5, [g(['Literatura','Inglés','Educación Física','Política y Ciudadanía'].map(name=>[name,72])),
        c([['Análisis Matemático',144],['Historia del Diseño y del Mobiliario',72]]),
        t([['Sistemas Mecánicos',108],['Ergonomía',108],['Tecnología de los Materiales',144],['Fabricación de Mobiliario',144],['Diseño y Representación',144]])]),
      year(6, [g(['Literatura','Inglés','Educación Física','Arte'].map(name=>[name,72])),
        c([['Matemática Aplicada',108],['Ciencia, Tecnología y Sociedad',72],['Derecho del Trabajo',72]]),
        t([['Materiales y Procesos',108],['Procesos de Fabricación de Mobiliario',216],['Tecnologías y Soluciones Constructivas',144],['Diseño y Prototipos de Mobiliario',144]])]),
      year(7, [p('Prácticas Profesionalizantes del Sector de la Madera y el Mueble'),
        c([['Emprendimientos Productivos y Desarrollo Local',72],['Seguridad, Higiene y Protección Ambiental',72],['Organización de los Procesos Productivos',108]]),
        t([['Instalación de Mobiliario y Estructuras de Madera',144],['Desarrollo de Productos de Mobiliario',144],['Instalaciones Industriales de Carpintería',108],['Fabricación Automatizada en Carpintería y Muebles',216]])])
    ]
  },
  obras: {
    source: 'Diseño curricular Maestro Mayor de Obras · nivel secundario',
    document: 'maestro_mayor_de_obras diseño curricular.pdf',
    reference: 'IF-2018-31695509-GDEBA-DETECDGCYE',
    pages: 'Perfil: páginas 2–7. Estructura curricular: página 8.',
    total: 5220,
    summary: 'El ciclo superior integra formación general, científico-tecnológica y técnica específica en representación, proyecto, construcciones e instalaciones. Séptimo incorpora proyecto integrador, gerenciamiento, normativa y prácticas profesionalizantes.',
    focus: 'Formación para transformar necesidades en proyectos edilicios, producir documentación técnica y gestionar procesos constructivos, con criterios de responsabilidad social y profesional.',
    goals: ['Analizar necesidades y desarrollar anteproyectos y proyectos de espacios construidos.', 'Integrar estructuras, materiales e instalaciones en propuestas y documentación de obra.', 'Planificar, dirigir y administrar procesos constructivos y brindar asesoramiento técnico dentro del marco profesional aplicable.'],
    years: [
      year(4, [g(fg(4)), c([['Matemática Ciclo Superior',144],['Física',108],['Química',72],['Materiales para la Construcción',72]]),
        t([['Dibujo Asistido por PC',108],['Representación Gráfica de Proyectos',108],['Introducción a las Construcciones',144],['Procesos Constructivos',72],['Diseño Arquitectónico I',72]])]),
      year(5, [g(fg(5)), c([['Análisis Matemático',144],['Instalaciones Eléctricas',108],['Estática y Resistencia de los Materiales',180]]),
        t([['Documentación de Obra',144],['Patología de las Construcciones',72],['Construcciones I',108],['Diseño Arquitectónico II',144]])]),
      year(6, [g(fg(6)), c([['Matemática Aplicada',72],['Instalaciones Sanitarias y de Gas',108],['Estructuras I',216],['Derechos del Trabajo',72]]),
        t([['Instalaciones I',216],['Gestión y Mantenimiento de las Instalaciones',72],['Construcciones II',72],['Diseño Arquitectónico III',144]])]),
      year(7, [p('Prácticas Profesionalizantes del Sector Construcciones'),
        c([['Emprendimientos e Innovación Productiva',72],['Estructuras II - Metálicas y de Madera',144],['Instalaciones Térmicas y Acondicionamiento del Aire',144]]),
        t([['Proyecto Integrador',252],['Gerenciamiento de Obra',216],['Normativa Profesional de la Construcción',180]])])
    ]
  }
};
