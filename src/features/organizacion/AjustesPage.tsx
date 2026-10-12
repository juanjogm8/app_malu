import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEscritura, useConexion } from '@/app/datos'
import { usePersonas } from '@/app/personas'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Boton, Interruptor } from '@/components/ui'
import { es } from '@/i18n/es'
import { supabase } from '@/lib/supabase'
import type { AppSettings, GoogleAccount } from '@/types/db'

const t = es.ajustes
const BOT = (import.meta.env.VITE_TELEGRAM_BOT as string | undefined)?.replace(/^@/, '')
const HORAS = Array.from({ length: 18 }, (_, i) => i + 5)

export function AjustesPage() {
  const p = usePersonas()
  const yo = p.me ? (p.byId(p.me.id) ?? p.me) : null
  const w = useEscritura()
  const toast = useToast()
  const qc = useQueryClient()
  const conexion = useConexion()
  const [codigo, setCodigo] = useState<string | null>(null)

  const ajustes = useQuery({
    queryKey: ['ajustes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').maybeSingle()
      if (error) throw error
      return data as AppSettings | null
    },
  })
  const porPersona = ajustes.data?.telegram_digest_per_person ?? false

  const generar = async () => {
    if (!w.puedeEscribir()) return
    const { data, error } = await supabase.rpc('create_telegram_link_code')
    if (error) return toast.error(es.datos.noSeGuardo)
    setCodigo(data)
  }
  const desconectar = async () => {
    if (!w.puedeEscribir()) return
    const { error } = await supabase.rpc('unlink_telegram')
    if (error) return toast.error(es.datos.noSeGuardo)
    void qc.invalidateQueries({ queryKey: ['tabla', 'members'] })
    toast.show(t.desconectado)
  }
  const cambiarFlag = async (v: boolean) => {
    if (!w.puedeEscribir()) return
    qc.setQueryData<AppSettings | null>(['ajustes'], (old) =>
      old ? { ...old, telegram_digest_per_person: v } : old,
    )
    const { error } = await supabase
      .from('app_settings')
      .update({ telegram_digest_per_person: v })
      .eq('id', true)
    if (error) {
      void qc.invalidateQueries({ queryKey: ['ajustes'] })
      toast.error(es.datos.noSeGuardo)
    }
  }

  if (!yo) return null
  const conectado = !!yo.telegram_chat_id

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-4">
      <h1 id="titulo-vista" className="font-display text-[30px] leading-none font-normal">
        {t.titulo}
      </h1>

      <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[22px] font-normal">Telegram</h2>
          <span
            className={`flex h-7 items-center gap-1 rounded-[14px] px-2.5 text-[13px] font-bold ${
              conectado ? 'bg-ok-soft text-ok' : 'bg-tint text-muted'
            }`}
          >
            {conectado && <Icon name="palomita" size={12} stroke={3} />}
            {conectado ? t.conectado : t.noConectado}
          </span>
        </div>
        <p className="text-[14px] leading-[1.45] text-muted">{t.explicacion}</p>
        {conectado ? (
          <Boton variante="secundario" className="self-start" onClick={() => void desconectar()}>
            {t.desconectar}
          </Boton>
        ) : codigo ? (
          <div className="flex flex-col gap-2.5 rounded-[14px] bg-tint p-3">
            <p className="text-[14px]">{t.pasos(BOT)}</p>
            <p className="tnum text-center font-display text-[30px] tracking-[0.12em] select-all">
              /start {codigo}
            </p>
            {BOT && (
              <a
                href={`https://t.me/${BOT}?start=${codigo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="press flex h-12 items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-accent-ink"
              >
                <Icon name="externo" size={18} />
                {t.abrirTelegram}
              </a>
            )}
            <p className="text-[12px] text-muted">{t.caduca}</p>
          </div>
        ) : (
          <Boton
            className="self-start"
            disabled={conexion === 'sin-conexion'}
            onClick={() => void generar()}
          >
            {t.conectar}
          </Boton>
        )}
      </div>

      <GoogleCalendar />

      <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4">
        <h2 className="font-display text-[22px] font-normal">{t.resumenes}</h2>
        <Interruptor checked={porPersona} onChange={(v) => void cambiarFlag(v)}>
          <span className="text-left">
            <span className="block text-[15px] font-semibold text-ink">{t.cadaQuien}</span>
            <span className="block text-[13px]">{porPersona ? t.cadaQuienSi : t.cadaQuienNo}</span>
          </span>
        </Interruptor>
        {porPersona && (
          <div className="flex flex-col gap-1 border-t border-tint pt-2">
            <Interruptor
              checked={yo.digest_daily}
              onChange={(v) => void w.update('members', yo.id, { digest_daily: v })}
            >
              <span className="text-[15px] font-semibold text-ink">{t.diario}</span>
            </Interruptor>
            {yo.digest_daily && (
              <label className="flex items-center gap-3 pl-12 text-[14px]">
                {t.hora}
                <select
                  className="field h-11 w-28"
                  value={yo.digest_daily_hour}
                  onChange={(e) =>
                    void w.update('members', yo.id, { digest_daily_hour: Number(e.target.value) })
                  }
                >
                  {HORAS.map((h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Interruptor
              checked={yo.digest_weekly}
              onChange={(v) => void w.update('members', yo.id, { digest_weekly: v })}
            >
              <span className="text-[15px] font-semibold text-ink">{t.semanal}</span>
            </Interruptor>
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------- Google Calendar (fase 3) ---------- */

function GoogleCalendar() {
  const p = usePersonas()
  const w = useEscritura()
  const toast = useToast()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [yendo, setYendo] = useState(false)
  const g = es.google

  const cuentas = useQuery({
    queryKey: ['google_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_accounts')
        .select(
          'member_id, google_email, can_write, status, last_error, last_sync_at, connected_at',
        )
      if (error) throw error
      return (data ?? []) as GoogleAccount[]
    },
  })
  const ajustes = useQuery<AppSettings | null>({ queryKey: ['ajustes'], enabled: false })

  // Aviso al volver de Google (?google=ok|error|cancelado).
  useEffect(() => {
    const r = params.get('google')
    if (!r) return
    if (r === 'ok') toast.show(g.conectadoOk)
    else if (r === 'cancelado') toast.show(g.cancelado)
    else toast.error(g.errorConectar)
    void qc.invalidateQueries({ queryKey: ['google_accounts'] })
    void qc.invalidateQueries({ queryKey: ['ajustes'] })
    params.delete('google')
    setParams(params, { replace: true })
  }, [params, setParams, toast, qc, g])

  const conectar = async (escritura: boolean) => {
    if (!w.puedeEscribir()) return
    setYendo(true)
    const { data, error } = await supabase.functions.invoke<{ url: string }>('gcal-auth', {
      body: { escritura },
    })
    if (error || !data?.url) {
      setYendo(false)
      return toast.error(g.errorConectar)
    }
    window.location.href = data.url
  }
  const desconectar = async () => {
    if (!w.puedeEscribir()) return
    const { error } = await supabase.rpc('gcal_desconectar')
    if (error) return toast.error(es.datos.noSeGuardo)
    void qc.invalidateQueries({ queryKey: ['google_accounts'] })
    void qc.invalidateQueries({ queryKey: ['tabla', 'google_events'] })
    toast.show(g.desconectado)
  }

  const mia = cuentas.data?.find((c) => c.member_id === p.me?.id)
  const otra = cuentas.data?.find((c) => c.member_id !== p.me?.id)
  const escritor = ajustes.data?.gcal_writer_id

  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[22px] font-normal">Google Calendar</h2>
        <span
          className={`flex h-7 items-center gap-1 rounded-[14px] px-2.5 text-[13px] font-bold ${
            mia?.status === 'error'
              ? 'bg-danger-soft text-danger'
              : mia
                ? 'bg-ok-soft text-ok'
                : 'bg-tint text-muted'
          }`}
        >
          {mia?.status === 'ok' && <Icon name="palomita" size={12} stroke={3} />}
          {mia?.status === 'error' && <Icon name="alerta" size={12} stroke={3} />}
          {mia ? (mia.status === 'error' ? g.conError : t.conectado) : t.noConectado}
        </span>
      </div>
      <p className="text-[14px] leading-[1.45] text-muted">{g.explicacion}</p>
      {mia ? (
        <>
          <p className="text-[14px]">
            {g.cuenta} <b>{mia.google_email}</b>
            {mia.last_error && <span className="block text-danger">{mia.last_error}</span>}
          </p>
          <div className="flex flex-col gap-1 rounded-[14px] bg-tint p-3">
            <span className="text-[15px] font-semibold">{g.compartido}</span>
            <span className="text-[13px] text-muted">
              {escritor === p.me?.id
                ? g.compartidoActivo
                : escritor
                  ? g.compartidoOtro(p.partnerName)
                  : g.compartidoAyuda}
            </span>
            {escritor === p.me?.id && (
              <span className="text-[13px] text-muted">{g.compartir(p.partnerName)}</span>
            )}
            {!mia.can_write && escritor !== p.me?.id && (
              <Boton
                chico
                variante="secundario"
                className="mt-1 self-start"
                disabled={yendo}
                onClick={() => void conectar(true)}
              >
                {g.activarEscritura}
              </Boton>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {mia.status === 'error' && (
              <Boton chico disabled={yendo} onClick={() => void conectar(mia.can_write)}>
                {g.reconectar}
              </Boton>
            )}
            <Boton
              chico
              variante="fantasma"
              className="text-danger"
              onClick={() => void desconectar()}
            >
              {g.desconectar}
            </Boton>
          </div>
        </>
      ) : (
        <>
          <p className="rounded-[14px] bg-warn-soft px-3 py-2.5 text-[13px] leading-[1.45] text-ink">
            {g.aviso}
          </p>
          <Boton className="self-start" disabled={yendo} onClick={() => void conectar(false)}>
            {g.conectar}
          </Boton>
        </>
      )}
      {otra && (
        <p className="text-[13px] text-muted">
          {g.otra(p.partnerName)} {otra.status === 'error' ? g.conError.toLowerCase() : ''}
        </p>
      )}
    </div>
  )
}
