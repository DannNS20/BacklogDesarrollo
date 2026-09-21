interface TemplateInput {
  kind: 'student' | 'admin';
  mode: 'welcome' | 'reset';
  name: string;
  email: string;
  code?: string;
  password: string;
  portalUrl: string;
  senderName: string;
}

const SIGNATURE = (sender: string) =>
  `Atentamente,\n${sender}\nCoordinación de Servicio Social\nCentro Universitario de Tlaquepaque · Universidad de Guadalajara`;

/** Correo precargado con las credenciales; el administrador puede editarlo antes de enviarlo */
export function credentialsEmail({ kind, mode, name, email, code, password, portalUrl, senderName }: TemplateInput) {
  const isStudent = kind === 'student';
  const portal = `${portalUrl}${isStudent ? '/estudiante' : '/admin'}`;
  const portalName = isStudent ? 'Portal del Estudiante' : 'Portal Administrativo';

  const subject =
    mode === 'welcome'
      ? `Servicio Social CUTlaquepaque · Acceso al ${portalName}`
      : `Servicio Social CUTlaquepaque · Nueva contraseña de acceso`;

  const intro =
    mode === 'welcome'
      ? isStudent
        ? 'Te damos la bienvenida al Sistema de Control de Servicio Social del Centro Universitario de Tlaquepaque. Ya fuiste registrado(a) como prestador(a) de servicio social.'
        : 'Se te dio de alta como responsable en el Sistema de Control de Servicio Social del Centro Universitario de Tlaquepaque.'
      : 'Atendiendo tu solicitud, la Coordinación generó una nueva contraseña para tu acceso. La contraseña anterior ya no es válida.';

  const usage = isStudent
    ? 'Desde el portal podrás registrar tu entrada y salida con evidencia fotográfica, consultar tu horario asignado y el avance de tus horas.'
    : 'Desde el portal podrás dar de alta prestadores, revisar evidencias de asistencia y atender las solicitudes de tu área.';

  const user = isStudent && code ? `${code} o ${email}` : email;

  const body = `Buen día, ${name}:

${intro}

Tus datos de acceso al ${portalName} son:

  • Dirección: ${portal}
  • Usuario: ${user}
  • Contraseña: ${password}

${usage}

Por seguridad, no compartas tu contraseña con nadie.${
    isStudent ? ' Si la pierdes, puedes solicitar una nueva desde la opción "¿Olvidaste tu contraseña?" del portal.' : ''
  } Si no reconoces este mensaje, comunícate con la Coordinación de Servicio Social.

${SIGNATURE(senderName)}`;

  return { subject, body };
}
