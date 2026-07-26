"use strict";

const sharedSurveyOptions = {
  project: [
    ["writing", "Writing", "Escritura"],
    ["screenplay", "Screenplay", "Guion"],
    ["filming", "Filming", "Rodaje"],
    ["screening", "Screening", "Proyección"],
    ["other", "Other", "Otro"]
  ],
  expenses: [
    ["location", "Location/travel/permits", "Locación, viajes o permisos"],
    ["equipment", "Equipment rental/props/wardrobe", "Renta de equipo, utilería o vestuario"],
    ["catering", "Catering/crafty", "Comidas y catering"],
    ["marketing", "Marketing/screening/festivals", "Marketing, proyecciones o festivales"],
    ["other", "Other", "Otro"]
  ],
  fundraising: [
    ["appeal", "Direct appeal", "Solicitud directa"],
    ["crowdfunding", "Crowdfunding", "Financiamiento colectivo"],
    ["bake", "Bake sale", "Venta de repostería"],
    ["restaurant", "Restaurant fundraisers", "Recaudaciones en restaurantes"],
    ["silent", "Silent auction", "Subasta silenciosa"],
    ["events", "Events/movie screenings/festivals", "Eventos, proyecciones o festivales"],
    ["grants", "Grant partnerships with nonprofits", "Alianzas de subvenciones con organizaciones sin fines de lucro"],
    ["merch", "Merchandise", "Mercancía"],
    ["other", "Other", "Otro"]
  ],
  contribute: [
    ["making", "Making stuff", "Crear cosas"],
    ["networking", "Networking", "Crear conexiones"],
    ["volunteering", "Volunteering", "Voluntariado"],
    ["donation", "Giving money", "Donar dinero"]
  ]
};

function localizedOptions(group, languageIndex) {
  return sharedSurveyOptions[group].map(([key, english, spanish]) => ({
    key,
    label: languageIndex === 1 ? spanish : english
  }));
}

module.exports = {
  survey: {
    en: {
      title: "Survey",
      name: "Name",
      namePlaceholder: "Your name…",
      projectQuestion: "Do you have a project for 2024?",
      technicalQuestion: "Do you need technical assistance with…",
      projectDetails: "Name of project(s) or co-producers, so they are not counted twice",
      projectDetailsPlaceholder: "Your projects…",
      expensesQuestion: "What expenses do you anticipate for your project?",
      fundraisingQuestion: "What fundraising activities appeal to you? (Which ones would you attend if a friend invited you?)",
      restaurantHelp: "A restaurant sponsors a time window and Dust Wave receives a percentage of sales during that window.",
      contributeQuestion: "How would you contribute to a Dust Wave fundraising event?",
      contributionHelp: {
        making: "Food, art, decorations, films, copy, or marketing materials.",
        networking: "Ask potential donors for in-kind goods or services, invite friends, or share Dust Wave campaigns on personal social media.",
        volunteering: "Event planning, transportation or delivery, or event staffing."
      },
      otherIdeas: "Other fundraising ideas",
      otherIdeasPlaceholder: "Your fundraising ideas…",
      budget: "Estimate a 2024 annual budget for Dust Wave (four shorts, three competition films, and one screening event)",
      budgetPlaceholder: "Your estimate…",
      submit: "Submit",
      subject: "Dust Wave survey submission",
      projectOptions: localizedOptions("project", 0),
      expenseOptions: localizedOptions("expenses", 0),
      fundraisingOptions: localizedOptions("fundraising", 0),
      contributionOptions: localizedOptions("contribute", 0)
    },
    es: {
      title: "Encuesta",
      name: "Nombre",
      namePlaceholder: "Tu nombre…",
      projectQuestion: "¿Tienes un proyecto para 2024?",
      technicalQuestion: "¿Necesitas asistencia técnica con…?",
      projectDetails: "Nombre del proyecto o de las personas coproductoras, para no contarlo dos veces",
      projectDetailsPlaceholder: "Tus proyectos…",
      expensesQuestion: "¿Qué gastos anticipas para tu proyecto?",
      fundraisingQuestion: "¿Qué actividades de recaudación te interesan? (¿A cuáles asistirías si te invitara una amistad?)",
      restaurantHelp: "Un restaurante patrocina un periodo y Dust Wave recibe un porcentaje de las ventas realizadas durante ese tiempo.",
      contributeQuestion: "¿De qué maneras contribuirías a un evento de recaudación de Dust Wave?",
      contributionHelp: {
        making: "Comida, arte, decoraciones, películas, textos o materiales de marketing.",
        networking: "Pedir bienes o servicios en especie, invitar amistades o compartir campañas de Dust Wave en tus redes personales.",
        volunteering: "Planificación, transporte o entregas, o apoyo durante el evento."
      },
      otherIdeas: "Otras ideas para recaudar fondos",
      otherIdeasPlaceholder: "Tus ideas para recaudar fondos…",
      budget: "Calcula un presupuesto anual de Dust Wave para 2024 (cuatro cortos, tres películas de competencia y un evento de proyección)",
      budgetPlaceholder: "Tu estimación…",
      submit: "Enviar",
      subject: "Respuesta a la encuesta de Dust Wave",
      projectOptions: localizedOptions("project", 1),
      expenseOptions: localizedOptions("expenses", 1),
      fundraisingOptions: localizedOptions("fundraising", 1),
      contributionOptions: localizedOptions("contribute", 1)
    }
  },
  slacTerms: {
    en: {
      title: "SLAC Fund Terms",
      content: `
<h2>Overview</h2>
<p>The <strong>SLAC (Supporting Local Artists of Color) Fund</strong> supports aspiring writer/directors of color in New Mexico. Each selected filmmaker receives a support package worth <strong>$2,500</strong>, including tools, crew, fundraising help, and access to Dust Wave's community — leading to a premiere screening at <a href="https://www.guildcinema.com" target="_blank" rel="noopener noreferrer">The Guild Cinema</a> in Albuquerque.</p>
<h2>What Filmmakers Receive</h2>
<h3>Production Support</h3>
<ul>
  <li>Access to <strong>camera, sound, and lighting gear</strong> (as available)</li>
  <li>Assistance with <strong>location scouting</strong></li>
  <li>Access to <strong>crew</strong> from Dust Wave's network</li>
  <li><strong>Guidance</strong> through our Notion-based production system</li>
  <li class="indent">Shot lists, calendars, budget tracking, and task management</li>
</ul>
<h3>Fundraising &amp; Budgeting</h3>
<ul>
  <li><strong>Crowdfunding support</strong>, including:</li>
  <li class="indent">Campaign strategy</li>
  <li class="indent">Page content and video pitch guidance</li>
  <li class="indent">Launch and promo calendar</li>
  <li>Assistance organizing a <strong>local fundraising event</strong></li>
  <li>Support for <strong>budget creation and oversight</strong></li>
</ul>
<h3>Post-Production &amp; Strategy</h3>
<ul>
  <li>Assistance with <strong>editing</strong>, <strong>sound</strong>, and <strong>color</strong></li>
  <li><strong>Festival strategy</strong>, including:</li>
  <li class="indent">Application timelines</li>
  <li class="indent">Platform suggestions</li>
  <li class="indent">Submission letter assistance</li>
  <li><strong>Marketing support</strong>, such as:</li>
  <li class="indent">Flyer and social-media templates</li>
  <li class="indent">Press-release help</li>
</ul>
<h3>Final Showcase &amp; Visibility</h3>
<ul>
  <li>Guaranteed <strong>premiere screening at the Guild Cinema</strong></li>
  <li>Promotion through Dust Wave's platforms</li>
  <li>Opportunity for a Q&amp;A and community celebration</li>
  <li>Continued exposure through Dust Wave's network</li>
</ul>
<h2>Eligibility</h2>
<ul>
  <li><strong>Applicants must:</strong></li>
  <li class="indent">Identify as <strong>an aspiring writer/director of color</strong></li>
  <li class="indent">Be based in or able to work in <strong>New Mexico</strong></li>
  <li class="indent">Not be a current member of Dust Wave</li>
  <li class="indent">Have a <strong>short-film concept</strong> (5–15 minutes preferred)</li>
  <li class="indent">Be available to commit <strong>20 hours per week</strong> to the project</li>
  <li class="indent">Be open to collaboration and feedback</li>
</ul>
<h2>Participant Commitments</h2>
<ul>
  <li><strong>To receive full SLAC Fund support, filmmakers must:</strong></li>
  <li class="indent"><strong>Meet every deadline</strong> in pre-production, production, and post-production</li>
  <li class="indent"><strong>Complete all required administrative tasks</strong> (budgets, call sheets, and updates)</li>
  <li class="indent"><strong>Dedicate 20 hours per week</strong> to the project</li>
  <li class="indent"><strong>Honor Dust Wave's values</strong> — <a href="/about.html">see the full list</a>, including:</li>
  <li class="indentmore">Collaboration</li>
  <li class="indentmore">Mutual respect</li>
  <li class="indentmore">Joy in the process</li>
  <li class="indentmore">Integrity</li>
  <li class="indentmore">Cultural humility</li>
  <li class="indentmore">Collective responsibility</li>
</ul>
<h3>Credit Requirement</h3>
<ul>
  <li><strong>Every completed film must include this line in the end credits:</strong></li>
  <li class="indent">“This film was made possible with support from the SLAC Fund”</li>
  <li><strong>Every completed film must include these organizations in a Special Thanks section:</strong></li>
  <li class="indent">Dust Wave</li>
  <li class="indent">Cultivating Coders</li>
  <li class="indent">Nusenda Credit Union</li>
</ul>
<h3>Marketing Requirement</h3>
<ul>
  <li><strong>Every completed film will be featured on the Dust Wave website (<a href="https://dustwave.xyz">dustwave.xyz</a>).</strong></li>
  <li>Stills and clips may be used to promote Dust Wave and Dust Wave events or projects.</li>
</ul>
<h2>Terms of Removal</h2>
<ul>
  <li>Support may be revoked if a participant:</li>
  <li class="indent">Fails to meet expectations or deadlines</li>
  <li class="indent">Drops below the required time commitment</li>
  <li class="indent">Acts in ways that conflict with Dust Wave's values</li>
</ul>`
    },
    es: {
      title: "Términos del Fondo SLAC",
      content: `
<h2>Descripción general</h2>
<p>El <strong>Fondo SLAC (Apoyo a Artistas Locales de Color)</strong> apoya a guionistas y directores de color que están comenzando sus carreras en Nuevo México. Cada cineasta seleccionado recibe un paquete de apoyo con valor de <strong>$2,500</strong>, que incluye herramientas, equipo de producción, ayuda para recaudar fondos y acceso a la comunidad de Dust Wave, y culmina en una proyección de estreno en <a href="https://www.guildcinema.com" target="_blank" rel="noopener noreferrer">The Guild Cinema</a> de Albuquerque.</p>
<h2>Qué reciben las y los cineastas</h2>
<h3>Apoyo de producción</h3>
<ul>
  <li>Acceso a <strong>equipo de cámara, sonido e iluminación</strong> (según disponibilidad)</li>
  <li>Ayuda para <strong>buscar locaciones</strong></li>
  <li>Acceso a <strong>personal de producción</strong> de la red de Dust Wave</li>
  <li><strong>Orientación</strong> mediante nuestro sistema de producción en Notion</li>
  <li class="indent">Listas de tomas, calendarios, seguimiento del presupuesto y administración de tareas</li>
</ul>
<h3>Recaudación y presupuesto</h3>
<ul>
  <li><strong>Apoyo para financiamiento colectivo</strong>, que incluye:</li>
  <li class="indent">Estrategia de campaña</li>
  <li class="indent">Contenido de la página y orientación para el video de presentación</li>
  <li class="indent">Calendario de lanzamiento y promoción</li>
  <li>Ayuda para organizar un <strong>evento local de recaudación</strong></li>
  <li>Apoyo para <strong>crear y supervisar el presupuesto</strong></li>
</ul>
<h3>Posproducción y estrategia</h3>
<ul>
  <li>Ayuda con <strong>edición</strong>, <strong>sonido</strong> y <strong>color</strong></li>
  <li><strong>Estrategia de festivales</strong>, que incluye:</li>
  <li class="indent">Calendarios de inscripción</li>
  <li class="indent">Sugerencias de plataformas</li>
  <li class="indent">Ayuda con cartas de presentación</li>
  <li><strong>Apoyo de marketing</strong>, como:</li>
  <li class="indent">Plantillas para volantes y redes sociales</li>
  <li class="indent">Ayuda con comunicados de prensa</li>
</ul>
<h3>Presentación final y visibilidad</h3>
<ul>
  <li><strong>Proyección de estreno garantizada en el Guild Cinema</strong></li>
  <li>Promoción en las plataformas de Dust Wave</li>
  <li>Oportunidad de participar en preguntas y respuestas y una celebración comunitaria</li>
  <li>Difusión continua mediante la red de Dust Wave</li>
</ul>
<h2>Requisitos</h2>
<ul>
  <li><strong>Quienes soliciten deben:</strong></li>
  <li class="indent">Identificarse como <strong>guionistas o directores de color en etapa inicial</strong></li>
  <li class="indent">Vivir en <strong>Nuevo México</strong> o poder trabajar en el estado</li>
  <li class="indent">No ser integrantes actuales de Dust Wave</li>
  <li class="indent">Tener un <strong>concepto para un cortometraje</strong> (preferentemente de 5 a 15 minutos)</li>
  <li class="indent">Poder dedicar <strong>20 horas semanales</strong> al proyecto</li>
  <li class="indent">Estar abiertos a la colaboración y los comentarios</li>
</ul>
<h2>Compromisos de participación</h2>
<ul>
  <li><strong>Para recibir todo el apoyo del Fondo SLAC, las y los cineastas deben:</strong></li>
  <li class="indent"><strong>Cumplir todos los plazos</strong> de preproducción, producción y posproducción</li>
  <li class="indent"><strong>Completar todas las tareas administrativas</strong> requeridas (presupuestos, hojas de llamado y actualizaciones)</li>
  <li class="indent"><strong>Dedicar 20 horas semanales</strong> al proyecto</li>
  <li class="indent"><strong>Respetar los valores de Dust Wave</strong> — <a href="/es/about.html">consulta la lista completa</a>, que incluye:</li>
  <li class="indentmore">Colaboración</li>
  <li class="indentmore">Respeto mutuo</li>
  <li class="indentmore">Alegría en el proceso</li>
  <li class="indentmore">Integridad</li>
  <li class="indentmore">Humildad cultural</li>
  <li class="indentmore">Responsabilidad colectiva</li>
</ul>
<h3>Requisitos de créditos</h3>
<ul>
  <li><strong>Cada película terminada debe incluir esta línea en los créditos finales:</strong></li>
  <li class="indent">“Esta película fue posible gracias al apoyo del Fondo SLAC”</li>
  <li><strong>Cada película terminada debe incluir estas organizaciones en una sección de agradecimientos especiales:</strong></li>
  <li class="indent">Dust Wave</li>
  <li class="indent">Cultivating Coders</li>
  <li class="indent">Nusenda Credit Union</li>
</ul>
<h3>Requisitos de marketing</h3>
<ul>
  <li><strong>Cada película terminada aparecerá en el sitio de Dust Wave (<a href="https://dustwave.xyz">dustwave.xyz</a>).</strong></li>
  <li>Dust Wave podrá usar imágenes fijas y fragmentos para promocionar al colectivo y sus eventos o proyectos.</li>
</ul>
<h2>Condiciones para retirar el apoyo</h2>
<ul>
  <li>El apoyo podrá revocarse si una persona participante:</li>
  <li class="indent">No cumple las expectativas o los plazos</li>
  <li class="indent">Dedica menos tiempo del requerido</li>
  <li class="indent">Actúa de una manera que contradice los valores de Dust Wave</li>
</ul>`
    }
  }
};
