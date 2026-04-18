const clienteService = require('./clienteService');

// Por ahora logea en consola.
// En producción: reemplazar notificar() con Twilio, WhatsApp Cloud API, nodemailer, etc.
const notificar = async (cliente) => {
  const fecha = cliente.fecha_cumpleanos
    ? new Date(cliente.fecha_cumpleanos).toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })
    : '';
  const mensaje = `[Cumpleaños] En 5 días: ${cliente.nombre} ${cliente.apellido} — ${fecha} — Tel: ${cliente.telefono || 'sin teléfono'}`;
  console.log(mensaje);
  // Ejemplo futura integración WhatsApp:
  // if (cliente.telefono) await whatsappSend(cliente.telefono, mensaje);
};

const verificarCumpleanos = async () => {
  try {
    const proximos = await clienteService.getCumpleanosProximos(5);
    if (proximos.length === 0) {
      console.log('[Cumpleaños] Sin recordatorios para hoy');
      return;
    }
    for (const cliente of proximos) {
      await notificar(cliente);
    }
    console.log(`[Cumpleaños] ${proximos.length} recordatorio(s) enviado(s)`);
  } catch (err) {
    console.error('[Cumpleaños] Error al verificar:', err.message);
  }
};

module.exports = { verificarCumpleanos };
