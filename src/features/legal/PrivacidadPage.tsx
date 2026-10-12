import { Link } from 'react-router'
import { Pantalla } from '@/components/Pantalla'

/** Aviso de privacidad (público). Google lo pide para publicar la app que conecta Google Calendar. */
export function PrivacidadPage() {
  return (
    <Pantalla>
      <article className="flex flex-col gap-4 px-6 py-8 text-[15px] leading-[1.55]">
        <h1 className="font-display text-[30px] leading-[1.1] font-normal">Aviso de privacidad</h1>
        <p className="text-muted">Casa en Orden · última actualización: 12 de octubre de 2026</p>

        <p>
          Casa en Orden es una aplicación privada para organizar una casa entre dos personas. Solo
          pueden entrar las dos cuentas autorizadas; no está abierta al público.
        </p>

        <h2 className="font-display text-[20px] font-normal">Qué datos usa</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Tu nombre, correo y foto de tu cuenta de Google, para iniciar sesión.</li>
          <li>
            Lo que ustedes capturan: pendientes, eventos, listas, comidas, fechas, planes, notas y
            contactos.
          </li>
          <li>
            Si conectas Google Calendar: los eventos de tu calendario principal (solo lectura) y, si
            lo activas, los eventos que la app publica en el calendario "Casa en Orden" que ella
            misma crea.
          </li>
          <li>
            Si conectas Telegram o las notificaciones: el identificador de tu chat o de tu
            dispositivo.
          </li>
        </ul>

        <h2 className="font-display text-[20px] font-normal">Para qué</h2>
        <p>
          Solo para que la app funcione para las dos personas de la casa: mostrar y sincronizar la
          información, y enviar los resúmenes que eligieron. No se vende, no se comparte con
          terceros, no se usa para publicidad ni para entrenar modelos de inteligencia artificial.
        </p>

        <h2 className="font-display text-[20px] font-normal">Datos de Google</h2>
        <p>
          El uso de la información recibida de las API de Google cumple con la{' '}
          <a
            className="font-semibold text-accent underline underline-offset-2"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de datos de usuario de los servicios de API de Google
          </a>
          , incluidos los requisitos de uso limitado. El permiso de Google Calendar se guarda
          cifrado en el servidor y nunca se muestra en el navegador.
        </p>

        <h2 className="font-display text-[20px] font-normal">Dónde se guardan</h2>
        <p>
          En Supabase (base de datos y funciones) y Vercel (la aplicación web). En tu teléfono se
          guarda una copia para usar la app sin conexión, que se borra al cerrar sesión.
        </p>

        <h2 className="font-display text-[20px] font-normal">Cómo borrarlos</h2>
        <p>
          Puedes desconectar Google Calendar o Telegram en Ajustes en cualquier momento; al hacerlo
          se borran los datos copiados de esos servicios. También puedes quitar el acceso desde{' '}
          <a
            className="font-semibold text-accent underline underline-offset-2"
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            tu cuenta de Google
          </a>
          . Para borrar toda tu información, escribe a juanjogamur@gmail.com.
        </p>

        <Link to="/" className="mt-2 font-semibold text-accent">
          ‹ Volver a Casa en Orden
        </Link>
      </article>
    </Pantalla>
  )
}
