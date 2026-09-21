interface TemplateInput {
  kind: 'person' | 'staff';
  mode: 'welcome' | 'reset';
  name: string;
  email: string;
  code?: string;
  password: string;
  portalUrl: string;
  senderName: string;
}

/** Correo precargado con las credenciales; el operador puede editarlo antes de enviarlo */
export function credentialsEmail({ kind, mode, name, email, code, password, portalUrl, senderName }: TemplateInput) {
  const isPerson = kind === 'person';
  const portal = `${portalUrl}${isPerson ? '/acceso' : '/control'}`;
  const portalName = isPerson ? 'Portal de acceso' : 'Portal institucional';

  const subject =
    mode === 'welcome' ? `UniAccess CUTlaquepaque · Acceso al ${portalName}` : 'UniAccess CUTlaquepaque · Nueva contraseña de acceso';

  const intro =
    mode === 'welcome'
      ? isPerson
        ? 'Tu credencial digital ya está activa en UniAccess, el sistema de control de acceso del Centro Universitario de Tlaquepaque.'
        : 'Se te dio de alta como operador de UniAccess, el sistema de control de acceso del Centro Universitario de Tlaquepaque.'
      : 'Se generó una nueva contraseña para tu acceso. La contraseña anterior ya no es válida.';

  const usage = isPerson
    ? 'Desde el portal podrás registrar tu entrada y tu salida del campus. La primera vez, vincula la biometría de tu teléfono desde "Mi perfil": es lo que confirma tu identidad en cada registro.'
    : 'Desde el portal podrás consultar quién está dentro del campus, emitir pases de invitado y atender las alertas.';

  const body = `Buen día, ${name}:

${intro}

Tus datos de acceso al ${portalName} son:

  • Dirección: ${portal}
  • Usuario: ${isPerson && code ? `${code} o ${email}` : email}
  • Contraseña: ${password}

${usage}

Por seguridad, no compartas tu contraseña. Si no reconoces este mensaje, repórtalo en la caseta de vigilancia.

Atentamente,
${senderName}
UniAccess · Centro Universitario de Tlaquepaque
Universidad de Guadalajara`;

  return { subject, body };
}
