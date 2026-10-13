const contactForm = document.querySelector('.formulario-contacto');
if (contactForm) {
  const contactStatus = contactForm.querySelector('.contacto-estado');
  const contactSubmit = contactForm.querySelector('button[type="submit"]');
  const localContact = ['localhost', '127.0.0.1'].includes(location.hostname);
  const contactNotice = (message, error = false) => {
    contactStatus.textContent = message;
    contactStatus.hidden = false;
    contactStatus.dataset.tipo = error ? 'error' : 'info';
    contactStatus.focus();
  };
  if (localContact || window.CMS_PREVIEW) {
    contactSubmit.disabled = true;
    contactNotice('Este formulario recibe consultas únicamente en el sitio publicado. En desarrollo y vista previa no se envían datos.');
  }
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (localContact || window.CMS_PREVIEW || contactForm.dataset.ocupado === 'true') return;
    if (!contactForm.reportValidity()) return;
    const data = new FormData(contactForm);
    const values = ['nombre', 'correo', 'asunto', 'mensaje'];
    for (const key of values) {
      const value = data.get(key).trim();
      if (!value) {
        contactNotice('Completá todos los campos con información válida.', true);
        return;
      }
      data.set(key, value);
    }
    if (data.get('nombre').length < 2 || data.get('mensaje').length < 10) {
      contactNotice('Ingresá un nombre de al menos 2 caracteres y un mensaje de al menos 10 caracteres.', true);
      return;
    }
    contactForm.dataset.ocupado = 'true';
    contactForm.setAttribute('aria-busy', 'true');
    contactSubmit.disabled = true;
    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString(),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      contactForm.reset();
      contactNotice('Tu consulta fue recibida. La institución podrá responder al correo que indicaste; el envío no confirma una inscripción.');
    } catch (error) {
      console.error('Envío de consulta:', error.name, error.message);
      contactNotice('No pudimos confirmar la recepción. Tus datos siguen en el formulario. Revisá la conexión antes de reintentar; si el envío llegó, un segundo intento podría duplicarlo.', true);
    } finally {
      delete contactForm.dataset.ocupado;
      contactForm.removeAttribute('aria-busy');
      contactSubmit.disabled = false;
    }
  });
}
