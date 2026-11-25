# Climatizar.com — The Ultimate HVAC Digital Experience

Rediseño web premium y de alta conversión para **Climatizar.com**, empresa especializada en instalación, mantenimiento, reparación y service técnico de aire acondicionado y refrigeración en CABA, GBA y todo el país.

---

## 🚀 Características Principales

- **Hero Cinematográfico**: Integración de gran formato del técnico uniformado, iluminación ambiental por capas, telemetría operativa y doble CTA hacia WhatsApp.
- **Autoridad Técnica**: Métricas reales de experiencia (+1.000 equipos instalados, 100% garantía escrita, turnos en 24-48 hs).
- **Servicios Especializados**: Layout editorial asimétrico con especificaciones técnicas detalladas y enlaces contextuales a WhatsApp.
- **Protocolo de 4 Fases**: Metodología paso a paso (Relevamiento térmico, materiales bajo norma IRAM, vacío profundo a menos de 500 micrones y prueba de salto térmico Delta T).
- **Calculadora Interactiva de Frigorías**: Estimación en tiempo real por superficie ($m^2$), tipo de ambiente y exposición solar, con recomendación Inverter y botón directo a WhatsApp.
- **Galería con Lightbox**: Proyectos reales con filtros por categoría y visualizador modal a pantalla completa con navegación por teclado.
- **Validador de Cobertura**: Buscador en tiempo real de disponibilidad técnica para barrios y partidos de CABA y GBA.
- **Formulario Express**: Canales rápidos de consulta con mensajes precargados según el servicio elegido.
- **Marcas Atendidas**: Soporte multimarca homologado (BGH, Samsung, LG, Daikin, Surrey, Carrier, Philco, Midea).
- **SEO & Datos Estructurados**: Schema.org `HVACBusiness` completo, Open Graph, Twitter Cards y semántica accesible (WCAG AA).

---

## 🛠️ Tecnologías Utilizadas

- **Vite 6** (Entorno de desarrollo ultra rápido y empaquetador de producción)
- **HTML5 Semántico & Schema.org JSON-LD**
- **Modern CSS3** (Tokens de diseño, custom properties, glassmorphism, layouts asimétricos, responsive design 360px–4K)
- **Vanilla Modern JavaScript** (IntersectionObserver, Scroll Progress, Spotlight, dynamic link generator)

---

## 📦 Instalación y Uso Local

```bash
# Clonar el repositorio
git clone https://github.com/Joel010999/refrigerio.git
cd refrigerio

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar el build de producción
npm run preview
```

## 🌐 Publicación (Railway + PostgreSQL)

La web corre con un servidor Node (`server/`) que sirve el sitio compilado (`dist/`), la API y el panel de administración, con los datos en PostgreSQL.

- **Build:** `npm run build` · **Start:** `npm start` (ya configurado en `railway.json`).
- **Variables:** `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET` (ver `.env.example`). Las tablas se crean y se cargan con el contenido inicial al arrancar.
- **Local:** `npm run build && npm start` con esas variables en el entorno.

Si el sitio se publica sin servidor (solo `dist/`), se ve el contenido fijo del HTML.

## 🛠️ Panel de administración (`/admin`)

- **Equipos:** alta, edición, foto, precio opcional, orden y visibilidad. Cada equipo genera su botón de WhatsApp con el mensaje armado.
- **Carrusel:** placas de la portada (servicios, promos, financiación) con botón a WhatsApp o a una sección.
- **WhatsApp:** número único para todos los botones de la web y plantilla del mensaje de los equipos.
- **Consultas:** clics en los botones de WhatsApp por equipo y por botón (24 h, 7 y 30 días).

---

## 📞 Canales de Contacto Directo

- **WhatsApp Principal**: [+54 9 11 7676-8392](https://wa.me/5491176768392)
- **Línea Secundaria**: [+54 9 2245 56-0209](tel:+5492245560209)
- **Ubicación**: Buenos Aires, Argentina
- **Horario**: Lunes a Sábados 8:00 a 20:00 hs

---
© 2026 Climatizar.com. Todos los derechos reservados.
