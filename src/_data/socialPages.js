"use strict";

module.exports = {
  home: {
    en: {
      title: "Dust Wave Social",
      description: "A local-first macOS app for connecting social accounts, preparing and scheduling posts, and reviewing analytics.",
      content: `
<p>Dust Wave Social is a local-first macOS application for connecting social accounts, preparing and scheduling content, publishing at the user's direction, and reviewing account and post analytics.</p>
<h2>Legal</h2>
<p>Read the <a href="/social/privacy/">Dust Wave Social Privacy Policy</a> and <a href="/social/terms/">Dust Wave Social Terms of Service</a>.</p>
<h2>Support</h2>
<p>Questions, data requests, and support requests may be submitted through the <a href="/contact.html">Dust Wave contact page</a>. Do not send passwords, access tokens, API keys, or other secrets in a support message.</p>`
    },
    es: {
      title: "Dust Wave Social",
      description: "Una aplicación local para macOS que permite conectar cuentas sociales, preparar y programar publicaciones y revisar estadísticas.",
      content: `
<p>Dust Wave Social es una aplicación local para macOS que permite conectar cuentas sociales, preparar y programar contenido, publicar según las instrucciones de la persona usuaria y revisar estadísticas de cuentas y publicaciones.</p>
<h2>Información legal</h2>
<p>Lee la <a href="/es/social/privacy/">Política de Privacidad de Dust Wave Social</a> y los <a href="/es/social/terms/">Términos de Servicio de Dust Wave Social</a>.</p>
<h2>Soporte</h2>
<p>Las preguntas, solicitudes sobre datos y solicitudes de soporte pueden enviarse mediante la <a href="/es/contact.html">página de contacto de Dust Wave</a>. No envíes contraseñas, tokens de acceso, claves de API ni otros secretos en un mensaje de soporte.</p>`
    }
  },
  privacy: {
    en: {
      title: "Dust Wave Social Privacy Policy",
      description: "How Dust Wave Social handles connected-account data, content, credentials, analytics, and temporary media.",
      content: `
<p><strong>Effective date:</strong> August 28, 2026</p>
<p>Dust Wave Social is a local-first macOS application for connecting social accounts, preparing and scheduling content, publishing content at the user's direction, and reviewing account and post analytics. This policy explains what information Dust Wave Social handles and when information leaves the user's Mac.</p>
<h2>Who operates Dust Wave Social</h2>
<p>Dust Wave operates Dust Wave Social. Privacy questions and data requests may be submitted through the <a href="/contact.html">Dust Wave contact page</a>.</p>
<h2>Information Dust Wave Social handles</h2>
<ul>
  <li><strong>Connected-account information:</strong> provider account identifiers, display names, usernames, profile images, granted permissions, connection status, and provider-specific account metadata.</li>
  <li><strong>Authentication information:</strong> OAuth access and refresh tokens, API credentials, and opaque broker connection credentials needed to connect to services selected by the user.</li>
  <li><strong>Content and media:</strong> drafts, captions, publishing destinations, schedules, uploaded media, and provider responses associated with content the user prepares or publishes.</li>
  <li><strong>Analytics:</strong> audience, post, video, engagement, and account metrics retrieved from connected providers at the user's request.</li>
  <li><strong>Local operational data:</strong> settings, service configuration, job status, redacted logs, backup metadata, and error details needed to operate and troubleshoot the app.</li>
  <li><strong>Search requests:</strong> keywords sent to media providers when the user searches services such as Unsplash or Klipy.</li>
</ul>
<h2>How information is used</h2>
<p>Dust Wave Social uses information only to provide user-requested features: connecting accounts, importing account data, searching media, preparing and scheduling content, publishing or assisting with publishing, displaying analytics, maintaining connections, creating local backups, and diagnosing failures.</p>
<h2>Where information is stored</h2>
<ul>
  <li>App state, drafts, schedules, imported analytics, and redacted operational records are stored locally in the app's SQLite database and app-data directory.</li>
  <li>Provider credentials and account tokens used directly by the desktop app are stored in the macOS Keychain, not in the local database or local backups.</li>
  <li>TikTok OAuth access and refresh tokens are encrypted and stored by Dust Wave's Cloudflare-hosted TikTok broker. The desktop app stores only an opaque broker connection credential in the macOS Keychain. Broker connection credentials are stored by the broker only as one-way hashes.</li>
  <li>When a provider requires a public media URL, selected media may be uploaded to Dust Wave's Cloudflare-hosted media staging service. Staged objects use hard-to-guess URLs and are temporary: the default lifetime is 24 hours and the maximum requested lifetime is seven days.</li>
</ul>
<h2>When information is shared</h2>
<p>Dust Wave Social sends information to a third-party service only when needed for a feature the user chooses. Depending on the configured integrations, those services may include Apple, Cloudflare, Meta/Facebook, Instagram, X, TikTok, Mastodon servers, Unsplash, and Klipy. Each service processes information under its own terms and privacy policy.</p>
<p>Dust Wave does not sell personal information, use connected-account data for advertising, or include hidden behavioral telemetry in Dust Wave Social.</p>
<h2>Data retention and deletion</h2>
<p>Local app data remains on the user's Mac until the user deletes it, removes an account, restores or resets the app, or removes the application data. Keychain credentials remain until removed by the app, the user, or macOS. Temporary staged media expires automatically under the limits described above.</p>
<p>Users can disconnect accounts in Dust Wave Social and can also revoke access through the connected provider. For deletion of TikTok broker data or other information held by Dust Wave-hosted services, submit a request through the <a href="/contact.html">Dust Wave contact page</a> and identify the provider account concerned without sending passwords, access tokens, or API keys.</p>
<h2>Security</h2>
<p>Dust Wave Social minimizes remote storage, keeps desktop credentials in the macOS Keychain, encrypts TikTok tokens held by the broker, hashes broker connection credentials, and redacts secrets from logs and support exports. No method of storage or transmission is completely secure, and users should revoke provider access if they believe a connection has been compromised.</p>
<h2>User choices and rights</h2>
<p>Users choose which providers to connect and which permissions to grant. Provider access can be revoked at any time. Depending on applicable law, users may also request access to, correction of, or deletion of personal information held by Dust Wave-hosted services through the <a href="/contact.html">Dust Wave contact page</a>.</p>
<h2>Children</h2>
<p>Dust Wave Social is not directed to children under 13, and Dust Wave does not knowingly collect personal information from children through the app.</p>
<h2>International processing</h2>
<p>Connected providers and infrastructure services may process information in countries other than the user's own. Their processing is governed by their respective policies and applicable law.</p>
<h2>Changes to this policy</h2>
<p>Dust Wave may update this policy when Dust Wave Social's features, providers, or data practices change. The effective date above will be updated when material changes are published.</p>`
    },
    es: {
      title: "Política de Privacidad de Dust Wave Social",
      description: "Cómo Dust Wave Social maneja datos de cuentas conectadas, contenido, credenciales, estadísticas y archivos multimedia temporales.",
      content: `
<p><strong>Fecha de entrada en vigor:</strong> 28 de agosto de 2026</p>
<p>Dust Wave Social es una aplicación local para macOS que permite conectar cuentas sociales, preparar y programar contenido, publicar contenido según las instrucciones de la persona usuaria y revisar estadísticas de cuentas y publicaciones. Esta política explica qué información maneja Dust Wave Social y cuándo sale información de la Mac de la persona usuaria.</p>
<h2>Quién opera Dust Wave Social</h2>
<p>Dust Wave opera Dust Wave Social. Las preguntas sobre privacidad y las solicitudes relacionadas con datos pueden enviarse mediante la <a href="/es/contact.html">página de contacto de Dust Wave</a>.</p>
<h2>Información que maneja Dust Wave Social</h2>
<ul>
  <li><strong>Información de cuentas conectadas:</strong> identificadores de cuentas de proveedores, nombres para mostrar, nombres de usuario, imágenes de perfil, permisos concedidos, estado de conexión y metadatos específicos del proveedor.</li>
  <li><strong>Información de autenticación:</strong> tokens de acceso y actualización de OAuth, credenciales de API y credenciales opacas de conexión al intermediario necesarias para conectarse con los servicios elegidos por la persona usuaria.</li>
  <li><strong>Contenido y archivos multimedia:</strong> borradores, textos, destinos de publicación, horarios, archivos multimedia cargados y respuestas de proveedores asociadas con contenido que la persona usuaria prepara o publica.</li>
  <li><strong>Estadísticas:</strong> métricas de audiencia, publicaciones, videos, interacción y cuentas obtenidas de proveedores conectados a solicitud de la persona usuaria.</li>
  <li><strong>Datos operativos locales:</strong> ajustes, configuración de servicios, estado de tareas, registros censurados, metadatos de copias de seguridad y detalles de errores necesarios para operar y solucionar problemas de la aplicación.</li>
  <li><strong>Solicitudes de búsqueda:</strong> palabras clave enviadas a proveedores de contenido multimedia cuando la persona usuaria busca en servicios como Unsplash o Klipy.</li>
</ul>
<h2>Cómo se utiliza la información</h2>
<p>Dust Wave Social utiliza la información únicamente para proporcionar las funciones solicitadas por la persona usuaria: conectar cuentas, importar datos de cuentas, buscar contenido multimedia, preparar y programar contenido, publicar o ayudar a publicar, mostrar estadísticas, mantener conexiones, crear copias de seguridad locales y diagnosticar fallas.</p>
<h2>Dónde se almacena la información</h2>
<ul>
  <li>El estado de la aplicación, los borradores, los horarios, las estadísticas importadas y los registros operativos censurados se almacenan localmente en la base de datos SQLite y en el directorio de datos de la aplicación.</li>
  <li>Las credenciales de proveedores y los tokens de cuentas utilizados directamente por la aplicación de escritorio se almacenan en el Llavero de macOS, no en la base de datos local ni en las copias de seguridad locales.</li>
  <li>Los tokens de acceso y actualización de OAuth de TikTok se cifran y almacenan en el intermediario de TikTok de Dust Wave alojado en Cloudflare. La aplicación de escritorio almacena únicamente una credencial opaca de conexión al intermediario en el Llavero de macOS. El intermediario almacena las credenciales de conexión únicamente como hashes unidireccionales.</li>
  <li>Cuando un proveedor requiere una URL pública de contenido multimedia, los archivos seleccionados pueden cargarse en el servicio de preparación de archivos de Dust Wave alojado en Cloudflare. Los objetos preparados usan URL difíciles de adivinar y son temporales: la duración predeterminada es de 24 horas y la duración máxima solicitada es de siete días.</li>
</ul>
<h2>Cuándo se comparte información</h2>
<p>Dust Wave Social envía información a un servicio externo únicamente cuando es necesario para una función elegida por la persona usuaria. Según las integraciones configuradas, esos servicios pueden incluir Apple, Cloudflare, Meta/Facebook, Instagram, X, TikTok, servidores de Mastodon, Unsplash y Klipy. Cada servicio procesa la información conforme a sus propios términos y política de privacidad.</p>
<p>Dust Wave no vende información personal, no utiliza datos de cuentas conectadas para publicidad ni incluye telemetría conductual oculta en Dust Wave Social.</p>
<h2>Retención y eliminación de datos</h2>
<p>Los datos locales de la aplicación permanecen en la Mac de la persona usuaria hasta que esta los elimina, quita una cuenta, restaura o restablece la aplicación, o elimina los datos de la aplicación. Las credenciales del Llavero permanecen hasta que las elimina la aplicación, la persona usuaria o macOS. Los archivos temporales preparados caducan automáticamente conforme a los límites descritos anteriormente.</p>
<p>Las personas usuarias pueden desconectar cuentas en Dust Wave Social y también revocar el acceso mediante el proveedor conectado. Para solicitar la eliminación de datos del intermediario de TikTok o de otra información conservada por servicios alojados por Dust Wave, envía una solicitud mediante la <a href="/es/contact.html">página de contacto de Dust Wave</a> e identifica la cuenta del proveedor correspondiente sin enviar contraseñas, tokens de acceso ni claves de API.</p>
<h2>Seguridad</h2>
<p>Dust Wave Social reduce al mínimo el almacenamiento remoto, mantiene las credenciales de escritorio en el Llavero de macOS, cifra los tokens de TikTok conservados por el intermediario, aplica hashes a las credenciales de conexión al intermediario y censura secretos en registros y exportaciones de soporte. Ningún método de almacenamiento o transmisión es completamente seguro; las personas usuarias deben revocar el acceso del proveedor si creen que una conexión está comprometida.</p>
<h2>Opciones y derechos de las personas usuarias</h2>
<p>Las personas usuarias eligen qué proveedores conectar y qué permisos conceder. El acceso del proveedor puede revocarse en cualquier momento. Según la legislación aplicable, las personas usuarias también pueden solicitar acceso, corrección o eliminación de información personal conservada por servicios alojados por Dust Wave mediante la <a href="/es/contact.html">página de contacto de Dust Wave</a>.</p>
<h2>Menores</h2>
<p>Dust Wave Social no está dirigido a menores de 13 años y Dust Wave no recopila deliberadamente información personal de menores mediante la aplicación.</p>
<h2>Tratamiento internacional</h2>
<p>Los proveedores conectados y los servicios de infraestructura pueden procesar información en países distintos del país de la persona usuaria. Dicho tratamiento se rige por sus respectivas políticas y por la legislación aplicable.</p>
<h2>Cambios en esta política</h2>
<p>Dust Wave puede actualizar esta política cuando cambien las funciones, los proveedores o las prácticas de datos de Dust Wave Social. La fecha de entrada en vigor indicada arriba se actualizará cuando se publiquen cambios sustanciales.</p>`
    }
  },
  terms: {
    en: {
      title: "Dust Wave Social Terms of Service",
      description: "Terms governing use of the Dust Wave Social macOS application and its provider integrations.",
      content: `
<p><strong>Effective date:</strong> August 28, 2026</p>
<p>These Terms of Service apply to use of the Dust Wave Social macOS application and Dust Wave-hosted services that support its provider integrations. By using Dust Wave Social, the user agrees to these terms.</p>
<h2>What Dust Wave Social does</h2>
<p>Dust Wave Social helps users connect supported social and media services, prepare and schedule content, publish or assist with publishing at the user's direction, and review account and post analytics. Some features depend on third-party approval, API availability, account type, subscription tier, or server rules.</p>
<h2>User accounts and authority</h2>
<p>Users must provide accurate information, protect their devices and credentials, and connect only accounts they own or are authorized to manage. Users are responsible for activity performed through their connected accounts and for reviewing destinations, content, media, timing, and permissions before publishing.</p>
<h2>Acceptable use</h2>
<p>Users may not use Dust Wave Social to:</p>
<ul>
  <li>violate law, another person's rights, or a connected provider's terms or policies;</li>
  <li>publish unlawful, deceptive, harassing, infringing, or malicious content;</li>
  <li>impersonate another person or organization without authorization;</li>
  <li>send spam, manipulate engagement, scrape data, conduct surveillance, or evade provider limits;</li>
  <li>attempt to obtain another user's credentials or access data without permission; or</li>
  <li>interfere with the security or operation of Dust Wave Social, its supporting services, or a connected provider.</li>
</ul>
<h2>User content</h2>
<p>Users retain ownership of their content. The user gives Dust Wave only the limited permission needed to process, temporarily store, and transmit content to the destinations the user selects. The user represents that they have the rights and permissions needed to use and publish the content and media they submit.</p>
<h2>Connected services</h2>
<p>Dust Wave Social can interact with services operated by others, including Meta/Facebook, Instagram, X, TikTok, Mastodon servers, Unsplash, Klipy, Apple, and Cloudflare. Use of those services is also governed by their terms and policies. Dust Wave does not control provider approval decisions, outages, API changes, content moderation, account restrictions, rate limits, or data-retention practices.</p>
<h2>Publishing and automation</h2>
<p>Publishing occurs only through supported user actions and configured schedules. Users should verify every post and destination before submission. Network, provider, device, or scheduling failures can delay, duplicate, reject, or prevent a post. Dust Wave Social's status and logs are operational aids and do not guarantee that a provider displayed or retained content.</p>
<h2>Privacy and credentials</h2>
<p>The <a href="/social/privacy/">Dust Wave Social Privacy Policy</a> explains how the app handles connected-account data, content, credentials, analytics, and temporary media. Users must not send passwords, access tokens, API keys, or other secrets through support messages.</p>
<h2>Software updates and availability</h2>
<p>Dust Wave may change, suspend, or discontinue features to respond to security issues, provider changes, legal requirements, or product decisions. Users are responsible for installing updates and maintaining compatible macOS and provider accounts. Dust Wave does not promise that every integration or feature will remain available.</p>
<h2>Disclaimer</h2>
<p>Dust Wave Social is provided on an “as is” and “as available” basis to the fullest extent permitted by law. Dust Wave disclaims implied warranties, including merchantability, fitness for a particular purpose, and non-infringement. Dust Wave does not guarantee uninterrupted operation, provider approval, successful publication, analytics accuracy, audience outcomes, or preservation of third-party content.</p>
<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, Dust Wave will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenue, data, content, goodwill, or account access arising from use of Dust Wave Social or a connected service. Some jurisdictions do not allow certain exclusions, so these limitations may not apply in full.</p>
<h2>Suspension and termination</h2>
<p>Users may stop using Dust Wave Social and revoke connected-provider access at any time. Dust Wave may restrict access to hosted integration services when reasonably necessary to protect users, providers, Dust Wave, or the public; respond to misuse or security threats; or comply with law or provider requirements.</p>
<h2>Changes to these terms</h2>
<p>Dust Wave may update these terms as Dust Wave Social, provider requirements, or applicable law changes. The effective date above will be updated when revised terms are published. Continued use after an update means the user accepts the revised terms.</p>
<h2>Contact</h2>
<p>Questions about these terms may be submitted through the <a href="/contact.html">Dust Wave contact page</a>.</p>`
    },
    es: {
      title: "Términos de Servicio de Dust Wave Social",
      description: "Términos que rigen el uso de la aplicación Dust Wave Social para macOS y sus integraciones con proveedores.",
      content: `
<p><strong>Fecha de entrada en vigor:</strong> 28 de agosto de 2026</p>
<p>Estos Términos de Servicio se aplican al uso de la aplicación Dust Wave Social para macOS y de los servicios alojados por Dust Wave que respaldan sus integraciones con proveedores. Al usar Dust Wave Social, la persona usuaria acepta estos términos.</p>
<h2>Qué hace Dust Wave Social</h2>
<p>Dust Wave Social ayuda a las personas usuarias a conectar servicios sociales y de contenido multimedia compatibles, preparar y programar contenido, publicar o ayudar a publicar según sus instrucciones y revisar estadísticas de cuentas y publicaciones. Algunas funciones dependen de la aprobación de terceros, la disponibilidad de API, el tipo de cuenta, el nivel de suscripción o las reglas del servidor.</p>
<h2>Cuentas y autorización de las personas usuarias</h2>
<p>Las personas usuarias deben proporcionar información precisa, proteger sus dispositivos y credenciales, y conectar únicamente cuentas que les pertenezcan o que estén autorizadas a administrar. Son responsables de la actividad realizada mediante sus cuentas conectadas y de revisar los destinos, el contenido, los archivos multimedia, el momento y los permisos antes de publicar.</p>
<h2>Uso aceptable</h2>
<p>Las personas usuarias no pueden utilizar Dust Wave Social para:</p>
<ul>
  <li>infringir la ley, los derechos de otra persona o los términos o políticas de un proveedor conectado;</li>
  <li>publicar contenido ilícito, engañoso, acosador, infractor o malicioso;</li>
  <li>suplantar a otra persona u organización sin autorización;</li>
  <li>enviar spam, manipular la interacción, extraer datos, realizar vigilancia o evadir los límites de un proveedor;</li>
  <li>intentar obtener las credenciales de otra persona usuaria o acceder a datos sin permiso; o</li>
  <li>interferir con la seguridad o el funcionamiento de Dust Wave Social, sus servicios de apoyo o un proveedor conectado.</li>
</ul>
<h2>Contenido de las personas usuarias</h2>
<p>Las personas usuarias conservan la propiedad de su contenido. La persona usuaria concede a Dust Wave únicamente el permiso limitado necesario para procesar, almacenar temporalmente y transmitir contenido a los destinos que seleccione. La persona usuaria declara que cuenta con los derechos y permisos necesarios para utilizar y publicar el contenido y los archivos multimedia que envía.</p>
<h2>Servicios conectados</h2>
<p>Dust Wave Social puede interactuar con servicios operados por terceros, incluidos Meta/Facebook, Instagram, X, TikTok, servidores de Mastodon, Unsplash, Klipy, Apple y Cloudflare. El uso de esos servicios también se rige por sus términos y políticas. Dust Wave no controla las decisiones de aprobación de proveedores, interrupciones, cambios de API, moderación de contenido, restricciones de cuentas, límites de uso ni prácticas de retención de datos.</p>
<h2>Publicación y automatización</h2>
<p>La publicación ocurre únicamente mediante acciones compatibles de la persona usuaria y horarios configurados. Las personas usuarias deben verificar cada publicación y destino antes del envío. Las fallas de red, proveedor, dispositivo o programación pueden retrasar, duplicar, rechazar o impedir una publicación. El estado y los registros de Dust Wave Social son ayudas operativas y no garantizan que un proveedor haya mostrado o conservado el contenido.</p>
<h2>Privacidad y credenciales</h2>
<p>La <a href="/es/social/privacy/">Política de Privacidad de Dust Wave Social</a> explica cómo maneja la aplicación los datos de cuentas conectadas, el contenido, las credenciales, las estadísticas y los archivos multimedia temporales. Las personas usuarias no deben enviar contraseñas, tokens de acceso, claves de API ni otros secretos mediante mensajes de soporte.</p>
<h2>Actualizaciones y disponibilidad del software</h2>
<p>Dust Wave puede cambiar, suspender o descontinuar funciones para responder a problemas de seguridad, cambios de proveedores, requisitos legales o decisiones de producto. Las personas usuarias son responsables de instalar actualizaciones y mantener cuentas de macOS y de proveedores compatibles. Dust Wave no promete que todas las integraciones o funciones permanezcan disponibles.</p>
<h2>Exclusión de garantías</h2>
<p>Dust Wave Social se proporciona “tal cual” y “según disponibilidad”, en la máxima medida permitida por la ley. Dust Wave rechaza garantías implícitas, incluidas las de comerciabilidad, idoneidad para un propósito particular y ausencia de infracción. Dust Wave no garantiza el funcionamiento ininterrumpido, la aprobación de proveedores, la publicación exitosa, la precisión de las estadísticas, resultados de audiencia ni la conservación de contenido de terceros.</p>
<h2>Limitación de responsabilidad</h2>
<p>En la máxima medida permitida por la ley, Dust Wave no será responsable de daños indirectos, incidentales, especiales, consecuentes, ejemplares o punitivos, ni de pérdida de beneficios, ingresos, datos, contenido, reputación o acceso a cuentas que surjan del uso de Dust Wave Social o de un servicio conectado. Algunas jurisdicciones no permiten determinadas exclusiones, por lo que estas limitaciones podrían no aplicarse en su totalidad.</p>
<h2>Suspensión y terminación</h2>
<p>Las personas usuarias pueden dejar de utilizar Dust Wave Social y revocar el acceso de proveedores conectados en cualquier momento. Dust Wave puede restringir el acceso a servicios de integración alojados cuando sea razonablemente necesario para proteger a las personas usuarias, los proveedores, Dust Wave o el público; responder a usos indebidos o amenazas de seguridad; o cumplir la ley o los requisitos de proveedores.</p>
<h2>Cambios en estos términos</h2>
<p>Dust Wave puede actualizar estos términos cuando cambien Dust Wave Social, los requisitos de proveedores o la legislación aplicable. La fecha de entrada en vigor indicada arriba se actualizará cuando se publiquen términos revisados. El uso continuado después de una actualización significa que la persona usuaria acepta los términos revisados.</p>
<h2>Contacto</h2>
<p>Las preguntas sobre estos términos pueden enviarse mediante la <a href="/es/contact.html">página de contacto de Dust Wave</a>.</p>`
    }
  }
};
