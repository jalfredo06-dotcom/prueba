// Catálogos de la app: ocasiones, mensajes sugeridos, fondos, efectos y formatos.

export const FONTS = {
  playfair: { name: 'Playfair Display', css: '"Playfair Display", Georgia, serif', weight: 700 },
  greatvibes: { name: 'Great Vibes', css: '"Great Vibes", cursive', weight: 400 },
  pacifico: { name: 'Pacifico', css: 'Pacifico, cursive', weight: 400 },
  dancing: { name: 'Dancing Script', css: '"Dancing Script", cursive', weight: 700 },
  cinzel: { name: 'Cinzel', css: 'Cinzel, Georgia, serif', weight: 700 },
  montserrat: { name: 'Montserrat', css: 'Montserrat, system-ui, sans-serif', weight: 700 },
  lobster: { name: 'Lobster', css: 'Lobster, cursive', weight: 400 },
  quicksand: { name: 'Quicksand', css: 'Quicksand, system-ui, sans-serif', weight: 600 },
};

// Fondos degradados. text = color de texto sugerido, accent = color de detalles.
export const BACKGROUNDS = {
  fiesta:      { name: 'Fiesta',        colors: ['#ff6b6b', '#feca57', '#ff9ff3'], text: '#ffffff', accent: '#fff3b0' },
  nocheDorada: { name: 'Noche dorada',  colors: ['#0f0c29', '#302b63', '#24243e'], text: '#f8e7b5', accent: '#e6b84f' },
  marfil:      { name: 'Marfil',        colors: ['#fdfbf7', '#f3e7d3', '#e8d5b7'], text: '#6b4f2a', accent: '#b8893b' },
  azulReal:    { name: 'Azul real',     colors: ['#141e30', '#243b55', '#2c5364'], text: '#ffffff', accent: '#ffd166' },
  atardecer:   { name: 'Atardecer',     colors: ['#ff7e5f', '#feb47b', '#ffcf71'], text: '#ffffff', accent: '#fff1c1' },
  rosa:        { name: 'Rosa suave',    colors: ['#fbc2eb', '#f8a5c2', '#fad0c4'], text: '#7a1f45', accent: '#c2185b' },
  pastel:      { name: 'Pastel',        colors: ['#a1c4fd', '#c2e9fb', '#fbc2eb'], text: '#36437a', accent: '#6c5ce7' },
  lila:        { name: 'Lila',          colors: ['#8e2de2', '#c471f5', '#fa71cd'], text: '#ffffff', accent: '#ffe6fa' },
  cielo:       { name: 'Cielo',         colors: ['#e0f7ff', '#b3e5fc', '#ffffff'], text: '#2b5876', accent: '#4a90c2' },
  navidad:     { name: 'Navidad',       colors: ['#0b3d20', '#14532d', '#7f1d1d'], text: '#fff7e0', accent: '#facc15' },
  medianoche:  { name: 'Medianoche',    colors: ['#000428', '#004e92', '#1a1a40'], text: '#ffffff', accent: '#ffd700' },
  oceano:      { name: 'Océano',        colors: ['#1cb5e0', '#0a2a6b', '#000851'], text: '#ffffff', accent: '#9be7ff' },
  pasion:      { name: 'Pasión',        colors: ['#93291e', '#ed213a', '#ff5e62'], text: '#ffffff', accent: '#ffd1d1' },
  menta:       { name: 'Menta',         colors: ['#d4fc79', '#96e6a1', '#84fab0'], text: '#1f5135', accent: '#0f7a4a' },
  sol:         { name: 'Sol',           colors: ['#f6d365', '#fda085', '#ffe29f'], text: '#6b3a10', accent: '#b4521e' },
  bosque:      { name: 'Bosque',        colors: ['#134e5e', '#2f7d5c', '#71b280'], text: '#ffffff', accent: '#e9f7c0' },
  grafito:     { name: 'Grafito',       colors: ['#232526', '#414345', '#1c1c1c'], text: '#f5f5f5', accent: '#d4af37' },
  aurora:      { name: 'Aurora',        colors: ['#00c9ff', '#92fe9d', '#a18cd1'], text: '#14324a', accent: '#ffffff' },
  neon:        { name: 'Neón',          colors: ['#fc00ff', '#7f00ff', '#00dbde'], text: '#ffffff', accent: '#bdfcff' },
  champagne:   { name: 'Champaña',      colors: ['#f7e7ce', '#e6c9a8', '#fff3e0'], text: '#5a4632', accent: '#a07a3c' },
};

export const PATTERNS = {
  none: 'Ninguno',
  bokeh: 'Luces bokeh',
  rays: 'Rayos de luz',
  dots: 'Puntos',
  waves: 'Ondas',
  stripes: 'Rayas',
};

export const PARTICLES = {
  none: 'Ninguno',
  confeti: '🎊 Confeti',
  globos: '🎈 Globos',
  corazones: '💗 Corazones',
  estrellas: '⭐ Estrellas',
  destellos: '✨ Destellos',
  burbujas: '🫧 Burbujas',
  nieve: '❄️ Nieve',
  petalos: '🌸 Pétalos',
  fuegos: '🎆 Fuegos artificiales',
  birretes: '🎓 Birretes',
};

export const FRAMES = {
  polaroid: 'Polaroid',
  redondeado: 'Esquinas redondeadas',
  circulo: 'Círculo',
  dorado: 'Marco dorado',
  ninguno: 'Sin marco',
};

export const PHOTO_ANIMS = {
  mixto: 'Mixta (varía en cada foto)',
  kenburns: 'Acercamiento suave',
  polaroid: 'Caída tipo polaroid',
  deslizar: 'Deslizar',
  zoom: 'Zoom con rebote',
  giro: 'Giro de tarjeta',
  revelado: 'Revelado circular',
};

export const TEXT_ANIMS = {
  lineas: 'Líneas que aparecen',
  maquina: 'Máquina de escribir',
  zoom: 'Zoom suave',
};

// Relaciones de aspecto más usadas. w/h en orientación horizontal.
export const RATIOS = [
  { id: '16:9', w: 16, h: 9, h_use: 'YouTube · TV · PC', v_use: 'Stories · Reels · TikTok · Estados' },
  { id: '4:3', w: 4, h: 3, h_use: 'Tablet · Presentación', v_use: 'Tablet vertical' },
  { id: '3:2', w: 3, h: 2, h_use: 'Foto clásica', v_use: 'Pinterest' },
  { id: '5:4', w: 5, h: 4, h_use: 'Monitor 5:4', v_use: 'Publicación Instagram' },
  { id: '1:1', w: 1, h: 1, h_use: 'Cuadrado · Feed', v_use: 'Cuadrado · Feed' },
  { id: '21:9', w: 21, h: 9, h_use: 'Cine panorámico', v_use: 'Celular alargado' },
];

export const QUALITIES = {
  720: { name: 'HD 720p', long: 1280 },
  1080: { name: 'Full HD 1080p', long: 1920 },
};

// Ocasiones. event = muestra campos de fecha / hora / lugar.
export const OCCASIONS = [
  {
    id: 'cumple', name: 'Cumpleaños', emoji: '🎂', title: '¡Feliz Cumpleaños!', to: 'Para ', from: 'Con cariño, ',
    bg: 'fiesta', particles: 'confeti', pattern: 'bokeh', titleFont: 'pacifico', bodyFont: 'quicksand',
    messages: [
      'Que este nuevo año de vida venga lleno de alegrías, salud y sueños cumplidos. ¡Disfruta tu día al máximo!',
      'Hoy celebramos la dicha de tenerte. ¡Que la vida te sonría hoy y siempre!',
      'Un año más para reír, aprender y brillar. ¡Feliz cumpleaños, que todos tus deseos se hagan realidad!',
      'Que la felicidad de hoy te acompañe los 365 días del año. ¡Te queremos mucho!',
      'Por más momentos inolvidables, más aventuras y más pastel. ¡Feliz cumple!',
      'No cuentes los años, cuenta las sonrisas que regalaste. ¡Hoy te toca recibirlas todas!',
    ],
  },
  {
    id: 'invitacion', name: 'Invitación', emoji: '💌', title: '¡Estás invitado!', to: 'Querido ', from: 'Te esperamos, ', event: true,
    bg: 'nocheDorada', particles: 'destellos', pattern: 'bokeh', titleFont: 'playfair', bodyFont: 'montserrat',
    messages: [
      'Tenemos el gusto de invitarte a celebrar con nosotros un momento muy especial. ¡Tu presencia hará la diferencia!',
      'Prepárate para una noche de música, risas y buena compañía. ¡No puedes faltar!',
      'Queremos compartir este día contigo. Acompáñanos y hagamos juntos un recuerdo inolvidable.',
      'Se armó la fiesta y tú estás en la lista. ¡Confirma tu asistencia!',
      'Será un honor contar con tu compañía en esta celebración.',
    ],
  },
  {
    id: 'boda', name: 'Boda', emoji: '💍', title: 'Nos casamos', to: '', from: 'Con amor, ', event: true,
    bg: 'marfil', particles: 'petalos', pattern: 'rays', titleFont: 'greatvibes', bodyFont: 'playfair',
    messages: [
      'Con la bendición de Dios y de nuestros padres, tenemos el honor de invitarte a celebrar nuestra unión.',
      'Dos caminos se convierten en uno. Nos encantaría que fueras testigo de nuestro "sí, acepto".',
      'El amor nos unió y ahora queremos celebrarlo contigo. ¡Acompáñanos en el día más feliz de nuestras vidas!',
      'Juntos es nuestro lugar favorito. Te esperamos para brindar por el amor.',
      'Hay momentos en la vida que son especiales por sí solos, pero compartirlos con quienes queremos los hace inolvidables.',
    ],
  },
  {
    id: 'grado', name: 'Grado', emoji: '🎓', title: '¡Feliz Graduación!', to: 'Felicidades, ', from: 'Con orgullo, ',
    bg: 'azulReal', particles: 'birretes', pattern: 'rays', titleFont: 'cinzel', bodyFont: 'montserrat',
    messages: [
      'Tu esfuerzo, disciplina y dedicación hoy dan fruto. ¡Felicitaciones por este gran logro!',
      'Este título es solo el comienzo de todo lo grande que vas a lograr. ¡Estamos muy orgullosos de ti!',
      'Las noches de estudio valieron la pena. ¡Que este logro te abra las puertas a un futuro brillante!',
      'Hoy cierras un ciclo con broche de oro. ¡Vuela alto, el mundo te espera!',
      'El éxito es la suma de pequeños esfuerzos repetidos día tras día. ¡Lo lograste!',
      'Te invitamos a celebrar mi ceremonia de grado. ¡Gracias por acompañarme en este camino!',
    ],
  },
  {
    id: 'felicitacion', name: 'Felicitación', emoji: '🏆', title: '¡Felicitaciones!', to: 'Para ', from: 'Un abrazo, ',
    bg: 'atardecer', particles: 'confeti', pattern: 'rays', titleFont: 'playfair', bodyFont: 'quicksand',
    messages: [
      '¡Qué gran noticia! Te mereces cada uno de tus logros. ¡Sigue así!',
      'Tu talento y perseverancia te trajeron hasta aquí. ¡Felicidades de corazón!',
      'Celebramos contigo este triunfo. ¡Que vengan muchos éxitos más!',
      'Nuevo trabajo, nuevos retos, nuevas metas. ¡Mucho éxito en esta etapa!',
      'Lo soñaste, lo trabajaste y lo conseguiste. ¡Enhorabuena!',
    ],
  },
  {
    id: 'aniversario', name: 'Aniversario', emoji: '💞', title: 'Feliz Aniversario', to: 'Para ', from: 'Por siempre, ',
    bg: 'rosa', particles: 'corazones', pattern: 'bokeh', titleFont: 'greatvibes', bodyFont: 'playfair',
    messages: [
      'Cada día a tu lado es un regalo. Gracias por todos estos años de amor y complicidad.',
      'Un año más escribiendo juntos nuestra historia favorita. ¡Te amo!',
      'Contigo aprendí que el amor verdadero sí existe. ¡Feliz aniversario, mi amor!',
      'Por los momentos vividos y por todos los que nos faltan por vivir. ¡Salud por nosotros!',
      'El tiempo pasa, pero mi amor por ti solo crece.',
    ],
  },
  {
    id: 'babyshower', name: 'Baby shower', emoji: '🍼', title: 'Baby Shower', to: '', from: 'Con amor, ', event: true,
    bg: 'pastel', particles: 'burbujas', pattern: 'dots', titleFont: 'dancing', bodyFont: 'quicksand',
    messages: [
      'Un pequeño milagro está en camino y queremos celebrarlo contigo. ¡Acompáñanos!',
      'Pañales, risas y mucho amor. ¡Te esperamos en el baby shower!',
      'La cigüeña ya viene en camino. Ven a celebrar la llegada de nuestro bebé.',
      'Pronto seremos uno más en la familia. ¡Celebremos juntos esta dulce espera!',
    ],
  },
  {
    id: 'nacimiento', name: 'Nacimiento', emoji: '👶', title: '¡Bienvenido, bebé!', to: 'Para ', from: 'Con cariño, ',
    bg: 'cielo', particles: 'estrellas', pattern: 'bokeh', titleFont: 'dancing', bodyFont: 'quicksand',
    messages: [
      'Una nueva estrella llegó al mundo. ¡Felicidades a la familia por esta gran bendición!',
      'Que este pequeño ser llene su hogar de amor, risas y ternura.',
      'Bienvenido al mundo, pequeñito. ¡Te esperábamos con mucho amor!',
      'Hoy la familia crece y el corazón también. ¡Felicidades!',
    ],
  },
  {
    id: 'xv', name: 'XV años', emoji: '👑', title: 'Mis XV Años', to: '', from: 'Te espero, ', event: true,
    bg: 'lila', particles: 'destellos', pattern: 'bokeh', titleFont: 'greatvibes', bodyFont: 'montserrat',
    messages: [
      'Hay momentos inolvidables que se atesoran en el corazón para siempre. Por eso quiero que compartas conmigo mis quince años.',
      'Un sueño hecho realidad: mis XV años. ¡Me encantaría que me acompañaras!',
      'Dejo atrás la niñez para empezar una nueva etapa. Celebremos juntos esta noche mágica.',
      'Mi fiesta no estaría completa sin ti. ¡Te espero!',
    ],
  },
  {
    id: 'bautizo', name: 'Bautizo / Comunión', emoji: '🕊️', title: 'Mi Bautizo', to: '', from: 'Con amor, ', event: true,
    bg: 'cielo', particles: 'petalos', pattern: 'rays', titleFont: 'dancing', bodyFont: 'playfair',
    messages: [
      'Con mucha alegría te invitamos a celebrar el bautizo de nuestro hijo. ¡Acompáñanos en este día de bendición!',
      'Recibiré el sacramento de la Primera Comunión y deseo que me acompañes en este día tan especial.',
      'Bajo la mirada de Dios, iniciamos un camino de fe. Será una alegría contar contigo.',
      'Un pequeño corazón se llena de luz. Te esperamos para celebrarlo juntos.',
    ],
  },
  {
    id: 'navidad', name: 'Navidad', emoji: '🎄', title: '¡Feliz Navidad!', to: 'Para ', from: 'Con cariño, ',
    bg: 'navidad', particles: 'nieve', pattern: 'bokeh', titleFont: 'greatvibes', bodyFont: 'playfair',
    messages: [
      'Que la magia de la Navidad llene tu hogar de paz, amor y alegría. ¡Felices fiestas!',
      'Que esta Navidad sea el inicio de un año lleno de bendiciones y nuevos sueños.',
      'El mejor regalo es compartir con quienes amamos. ¡Feliz Navidad y próspero Año Nuevo!',
      'Paz en el corazón, sonrisas en la mesa y amor en cada abrazo. ¡Feliz Navidad!',
    ],
  },
  {
    id: 'anonuevo', name: 'Año Nuevo', emoji: '🎆', title: '¡Feliz Año Nuevo!', to: 'Para ', from: 'Un abrazo, ',
    bg: 'medianoche', particles: 'fuegos', pattern: 'none', titleFont: 'playfair', bodyFont: 'montserrat',
    messages: [
      'Que el nuevo año te traiga 12 meses de salud, 52 semanas de alegría y 365 días de éxitos.',
      'Brindemos por lo vivido y por todo lo bueno que está por venir. ¡Feliz Año Nuevo!',
      'Nuevo año, nuevas metas, nuevas oportunidades. ¡Que todos tus propósitos se cumplan!',
      'Gracias por ser parte de mi año. ¡Que el próximo sea aún mejor!',
    ],
  },
  {
    id: 'madre', name: 'Día de la Madre', emoji: '🌷', title: 'Feliz Día, Mamá', to: 'Para ', from: 'Te amo, ',
    bg: 'rosa', particles: 'petalos', pattern: 'bokeh', titleFont: 'greatvibes', bodyFont: 'playfair',
    messages: [
      'Gracias por tu amor infinito, tus consejos y tus abrazos que lo curan todo. ¡Feliz día, mamá!',
      'Eres mi primer hogar, mi ejemplo y mi mayor bendición. ¡Te amo!',
      'Por cada desvelo, cada sonrisa y cada sacrificio: gracias, mamá.',
      'No hay palabras suficientes para agradecer todo lo que eres. ¡Feliz Día de la Madre!',
    ],
  },
  {
    id: 'padre', name: 'Día del Padre', emoji: '👔', title: 'Feliz Día, Papá', to: 'Para ', from: 'Con cariño, ',
    bg: 'oceano', particles: 'estrellas', pattern: 'rays', titleFont: 'montserrat', bodyFont: 'quicksand',
    messages: [
      'Gracias por enseñarme con tu ejemplo, por tu fuerza y tu paciencia. ¡Feliz día, papá!',
      'Mi héroe, mi guía y mi mejor amigo. ¡Te quiero mucho!',
      'Todo lo que soy te lo debo en gran parte a ti. ¡Feliz Día del Padre!',
      'Por las lecciones, las risas y los abrazos. ¡Eres el mejor papá del mundo!',
    ],
  },
  {
    id: 'amor', name: 'Amor', emoji: '❤️', title: 'Para ti, con amor', to: 'Mi amor ', from: 'Tuyo/a siempre, ',
    bg: 'pasion', particles: 'corazones', pattern: 'bokeh', titleFont: 'lobster', bodyFont: 'playfair',
    messages: [
      'Eres mi persona favorita, mi lugar seguro y mi felicidad de cada día.',
      'Si tuviera que elegir otra vez, te elegiría a ti una y mil veces.',
      'Contigo los días comunes se vuelven extraordinarios. ¡Te amo!',
      'Feliz Día del Amor y la Amistad. Gracias por llenar mi vida de color.',
    ],
  },
  {
    id: 'gracias', name: 'Agradecimiento', emoji: '🙏', title: '¡Gracias!', to: 'Para ', from: 'Con gratitud, ',
    bg: 'menta', particles: 'destellos', pattern: 'dots', titleFont: 'pacifico', bodyFont: 'quicksand',
    messages: [
      'Gracias por estar siempre, por tu apoyo y tu generosidad. ¡Eres increíble!',
      'Hay personas que hacen el mundo mejor, y tú eres una de ellas. ¡Mil gracias!',
      'Tu ayuda significó muchísimo para mí. Gracias de todo corazón.',
      'Gracias por acompañarnos y hacer de nuestro día algo inolvidable.',
    ],
  },
  {
    id: 'recuperacion', name: 'Pronta recuperación', emoji: '🌻', title: 'Pronta recuperación', to: 'Para ', from: 'Con cariño, ',
    bg: 'sol', particles: 'petalos', pattern: 'rays', titleFont: 'dancing', bodyFont: 'quicksand',
    messages: [
      'Te enviamos mucha fuerza y buena energía. ¡Que te recuperes muy pronto!',
      'Cada día un poco mejor. Te extrañamos y te esperamos con los brazos abiertos.',
      'Que la salud vuelva pronto a ti y con ella tu hermosa sonrisa.',
      'Ánimo, eres más fuerte de lo que crees. ¡Pronto estarás como nuevo!',
    ],
  },
];
