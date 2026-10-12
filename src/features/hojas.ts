/* Esquemas de la hoja de captura para cada tipo de registro (campos del prototipo). */
import { useCallback, useMemo } from 'react'
import { useEscritura, useRows } from '@/app/datos'
import type { Row } from '@/app/datos'
import { usePersonas } from '@/app/personas'
import { useHoja } from '@/components/Hoja'
import type { Campo, Valores } from '@/components/Hoja'
import type { QuienSlot } from '@/components/estilos'
import { es } from '@/i18n/es'
import type { Entry } from '@/lib/calendario'
import { CATS } from '@/lib/categorias'
import { parsePrice } from '@/lib/dinero'
import { fLong, today } from '@/lib/fechas'
import { defaultRemind, defaultYearly, KIND_NAME } from '@/lib/fechas-importantes'
import { AREAS, STATUS_NAME, STATUS_ORDER } from '@/lib/listas'
import { whoFrom, whoToEvent, whoToTask } from '@/lib/personas'
import type { WhoValue } from '@/lib/personas'
import { REPEAT_NAME, REPEATS } from '@/lib/recurrencia'
import type { Meal, Task } from '@/types/db'

const REP_OPTS: [string, string][] = [
  ['', 'No se repite'],
  ...REPEATS.map((r): [string, string] => [r, REPEAT_NAME[r]]),
]
const PRIO_OPTS: [string, string][] = [
  ['alta', 'Alta'],
  ['media', 'Media'],
  ['baja', 'Baja'],
]
const TCATS = ['Casa', 'Pagos', 'Coche', 'Niños', 'Otro'] as const
const REMIND: [string, string][] = [
  ['1', '1 día antes'],
  ['3', '3 días antes'],
  ['7', '1 semana antes'],
  ['14', '2 semanas antes'],
  ['30', '1 mes antes'],
]
const KT: [string, string][] = [
  ['cita', 'Cita médica'],
  ['vacuna', 'Vacuna'],
  ['actividad', 'Actividad'],
  ['escuela', 'Escuela'],
  ['fiesta', 'Fiesta o regalo'],
  ['otro', 'Otro'],
]
const PK: [string, string][] = [
  ['restaurante', 'Restaurante'],
  ['finde', 'Plan de fin de semana'],
  ['pareja', 'Noche de pareja'],
  ['viaje', 'Viaje'],
  ['otro', 'Otro'],
]
const PST: [string, string][] = [
  ['idea', 'Idea'],
  ['planeado', 'Planeado'],
  ['hecho', 'Hecho'],
]
const ROLES = [
  'Plomero',
  'Electricista',
  'Pediatra',
  'Dentista',
  'Veterinario',
  'Cerrajero',
  'Jardinero',
  'Mecánico',
  'Pintor',
  'Carpintero',
  'Escuela',
  'Otro',
]
const MEAL_NAME = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena' } as const

const s = (v: Valores, k: string) => (typeof v[k] === 'string' ? (v[k] as string) : '')
const orNull = (x: string) => x || null
/** "08:30:00" → "08:30" para <input type="time"> */
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')

export function useHojas() {
  const hoja = useHoja()
  const w = useEscritura()
  const p = usePersonas()
  const { rows: tasks } = useRows('tasks')
  const { rows: events } = useRows('events')
  const { rows: dates } = useRows('important_dates')
  const { rows: kids } = useRows('kid_items')
  const { rows: plans } = useRows('plans')
  const { rows: meals } = useRows('meals')
  const { rows: google } = useRows('google_events')

  const quien = useCallback(
    (conNadie: boolean): Campo => {
      const opts: { v: string; label: string; slot: QuienSlot }[] = []
      if (p.me) opts.push({ v: p.me.id, label: es.quien.yo, slot: p.slot(p.me.id) })
      if (p.partner)
        opts.push({ v: p.partner.id, label: p.partnerName, slot: p.slot(p.partner.id) })
      opts.push({ v: 'both', label: es.quien.ambos, slot: 'both' })
      if (conNadie) opts.push({ v: '', label: es.quien.sinAsignar, slot: null })
      return { k: 'who', label: 'Quién', t: 'who', opts }
    },
    [p],
  )

  /* ---------- Pendientes ---------- */
  const camposTarea = useCallback(
    (): Campo[] => [
      {
        k: 'text',
        label: 'Pendiente',
        t: 'text',
        req: true,
        ph: 'Pagar la luz, llevar el coche al servicio…',
      },
      quien(true),
      { k: 'due_date', label: 'Fecha límite', t: 'date', mitad: true },
      { k: 'repeat', label: 'Se repite', t: 'select', opts: REP_OPTS, mitad: true },
      { k: 'category', label: 'Tipo', t: 'select', opts: TCATS.map((c) => [c, c]), mitad: true },
      { k: 'priority', label: 'Prioridad', t: 'select', opts: PRIO_OPTS, mitad: true },
      { k: 'rotate', label: 'Alternar responsable cada vez que se haga', t: 'check' },
      { k: 'notes', label: 'Notas', t: 'area' },
    ],
    [quien],
  )
  const packTarea = (v: Valores) => ({
    text: s(v, 'text'),
    ...whoToTask(s(v, 'who') as WhoValue),
    due_date: orNull(s(v, 'due_date')),
    repeat: orNull(s(v, 'repeat')) as Task['repeat'],
    category: (s(v, 'category') || 'Casa') as Task['category'],
    priority: (s(v, 'priority') || 'media') as Task['priority'],
    rotate: v.rotate === true,
    notes: orNull(s(v, 'notes')),
  })

  const nuevoPendiente = useCallback(
    (pre: Partial<Valores> = {}) =>
      hoja.abrir({
        titulo: 'Nuevo pendiente',
        campos: camposTarea(),
        valores: {
          who: '',
          priority: 'media',
          category: 'Casa',
          repeat: '',
          rotate: false,
          ...pre,
        } as Valores,
        onSave: async (v) => !!(await w.insert('tasks', packTarea(v))),
      }),
    [hoja, camposTarea, w],
  )
  const editarPendiente = useCallback(
    (t: Row<'tasks'>) =>
      hoja.abrir({
        titulo: 'Editar pendiente',
        campos: camposTarea(),
        valores: {
          text: t.text,
          who: whoFrom(t.assignee_id, t.is_shared),
          due_date: t.due_date ?? '',
          repeat: t.repeat ?? '',
          category: t.category,
          priority: t.priority,
          rotate: t.rotate,
          notes: t.notes ?? '',
        },
        onSave: (v) => w.update('tasks', t.id, packTarea(v)),
        onDelete: () => void w.remove('tasks', [t]),
      }),
    [hoja, camposTarea, w],
  )

  /* ---------- Eventos ---------- */
  const camposEvento = useCallback(
    (): Campo[] => [
      {
        k: 'title',
        label: 'Título',
        t: 'text',
        req: true,
        ph: 'Cena con amigos, junta de la escuela…',
      },
      { k: 'date', label: 'Fecha', t: 'date', req: true, mitad: true },
      { k: 'time', label: 'Hora', t: 'time', mitad: true },
      quien(false),
      { k: 'repeat', label: 'Repetir', t: 'select', opts: REP_OPTS },
      { k: 'place', label: 'Lugar', t: 'text' },
      { k: 'notes', label: 'Notas', t: 'area' },
    ],
    [quien],
  )
  const packEvento = (v: Valores) => ({
    title: s(v, 'title'),
    date: s(v, 'date'),
    time: orNull(s(v, 'time')),
    ...whoToEvent(s(v, 'who') as WhoValue),
    repeat: orNull(s(v, 'repeat')) as Task['repeat'],
    place: orNull(s(v, 'place')),
    notes: orNull(s(v, 'notes')),
  })
  const nuevoEvento = useCallback(
    (date?: string) =>
      hoja.abrir({
        titulo: 'Nuevo evento',
        campos: camposEvento(),
        valores: { who: 'both', repeat: '', date: date ?? today() },
        onSave: async (v) => !!(await w.insert('events', packEvento(v))),
      }),
    [hoja, camposEvento, w],
  )
  const editarEvento = useCallback(
    (e: Row<'events'>) =>
      hoja.abrir({
        titulo: 'Editar evento',
        campos: camposEvento(),
        valores: {
          title: e.title,
          date: e.date,
          time: hhmm(e.time),
          who: whoFrom(e.owner_id, e.is_shared),
          repeat: e.repeat ?? '',
          place: e.place ?? '',
          notes: e.notes ?? '',
        },
        onSave: (v) => w.update('events', e.id, packEvento(v)),
        onDelete: () => void w.remove('events', [e]),
      }),
    [hoja, camposEvento, w],
  )

  /* ---------- Fechas importantes ---------- */
  const camposFecha: Campo[] = useMemo(
    () => [
      {
        k: 'name',
        label: 'Nombre',
        t: 'text',
        req: true,
        ph: 'Mamá, seguro del coche, pasaporte de…',
      },
      { k: 'kind', label: 'Tipo', t: 'select', opts: Object.entries(KIND_NAME) },
      { k: 'date', label: 'Fecha (con año de nacimiento si lo sabes)', t: 'date', req: true },
      { k: 'remind_days', label: 'Avisar', t: 'select', opts: REMIND },
      { k: 'yearly', label: 'Se repite cada año', t: 'check' },
      { k: 'notes', label: 'Nota (idea de regalo, número de póliza…)', t: 'text' },
    ],
    [],
  )
  const packFecha = (v: Valores) => ({
    name: s(v, 'name'),
    kind: s(v, 'kind') as Row<'important_dates'>['kind'],
    date: s(v, 'date'),
    remind_days: Number(s(v, 'remind_days') || 7) as Row<'important_dates'>['remind_days'],
    yearly: v.yearly === true,
    notes: orNull(s(v, 'notes')),
  })
  const onChangeFecha = (k: string, v: Valores): Valores => {
    if (k !== 'kind') return v
    const kind = s(v, 'kind') as Row<'important_dates'>['kind']
    return { ...v, yearly: defaultYearly(kind), remind_days: String(defaultRemind(kind)) }
  }
  const nuevaFecha = useCallback(
    () =>
      hoja.abrir({
        titulo: 'Nueva fecha',
        campos: camposFecha,
        valores: { kind: 'cumple', yearly: true, remind_days: '7' },
        onChange: onChangeFecha,
        onSave: async (v) => !!(await w.insert('important_dates', packFecha(v))),
      }),
    [hoja, camposFecha, w],
  )
  const editarFecha = useCallback(
    (f: Row<'important_dates'>) =>
      hoja.abrir({
        titulo: 'Editar fecha',
        campos: camposFecha,
        valores: {
          name: f.name,
          kind: f.kind,
          date: f.date,
          remind_days: String(f.remind_days),
          yearly: f.yearly,
          notes: f.notes ?? '',
        },
        onChange: onChangeFecha,
        onSave: (v) => w.update('important_dates', f.id, packFecha(v)),
        onDelete: () => void w.remove('important_dates', [f]),
      }),
    [hoja, camposFecha, w],
  )

  /* ---------- Niños ---------- */
  const camposNino = useCallback(
    (): Campo[] => [
      {
        k: 'text',
        label: 'Qué es',
        t: 'text',
        req: true,
        ph: 'Revisión con el pediatra, útiles escolares…',
      },
      { k: 'kind', label: 'Tipo', t: 'select', opts: KT, mitad: true },
      {
        k: 'kid',
        label: 'Quién',
        t: 'text',
        ph: 'Nombre',
        mitad: true,
        sugerencias: [...new Set(kids.map((k) => k.kid).filter((x): x is string => !!x))],
      },
      { k: 'date', label: 'Fecha', t: 'date', mitad: true },
      { k: 'time', label: 'Hora', t: 'time', mitad: true },
      { k: 'notes', label: 'Notas (regalo, lugar, teléfono…)', t: 'area' },
    ],
    [kids],
  )
  const packNino = (v: Valores) => ({
    text: s(v, 'text'),
    kind: s(v, 'kind') as Row<'kid_items'>['kind'],
    kid: orNull(s(v, 'kid')),
    date: orNull(s(v, 'date')),
    time: orNull(s(v, 'time')),
    notes: orNull(s(v, 'notes')),
  })
  const nuevoNino = useCallback(
    (pre: Partial<Valores> = {}) =>
      hoja.abrir({
        titulo: 'Nuevo de los niños',
        campos: camposNino(),
        valores: { kind: 'cita', ...pre } as Valores,
        onSave: async (v) => !!(await w.insert('kid_items', packNino(v))),
      }),
    [hoja, camposNino, w],
  )
  const editarNino = useCallback(
    (k: Row<'kid_items'>) =>
      hoja.abrir({
        titulo: 'Editar',
        campos: camposNino(),
        valores: {
          text: k.text,
          kind: k.kind,
          kid: k.kid ?? '',
          date: k.date ?? '',
          time: hhmm(k.time),
          notes: k.notes ?? '',
        },
        onSave: (v) => w.update('kid_items', k.id, packNino(v)),
        onDelete: () => void w.remove('kid_items', [k]),
      }),
    [hoja, camposNino, w],
  )

  /* ---------- Planes ---------- */
  const camposPlan: Campo[] = useMemo(
    () => [
      {
        k: 'text',
        label: 'Idea',
        t: 'text',
        req: true,
        ph: 'Probar el restaurante nuevo, fin de semana en Valle…',
      },
      { k: 'kind', label: 'Tipo', t: 'select', opts: PK, mitad: true },
      { k: 'status', label: 'Estado', t: 'select', opts: PST, mitad: true },
      { k: 'date', label: 'Fecha', t: 'date', mitad: true },
      { k: 'place', label: 'Lugar', t: 'text', mitad: true },
      { k: 'link', label: 'Enlace', t: 'text', ph: 'https://…' },
      { k: 'notes', label: 'Notas', t: 'area' },
    ],
    [],
  )
  const packPlan = (v: Valores) => ({
    text: s(v, 'text'),
    kind: s(v, 'kind') as Row<'plans'>['kind'],
    status: s(v, 'status') as Row<'plans'>['status'],
    date: orNull(s(v, 'date')),
    place: orNull(s(v, 'place')),
    link: orNull(s(v, 'link')),
    notes: orNull(s(v, 'notes')),
  })
  const nuevoPlan = useCallback(
    (pre: Partial<Valores> = {}) =>
      hoja.abrir({
        titulo: 'Nueva idea',
        campos: camposPlan,
        valores: { kind: 'restaurante', status: 'idea', ...pre } as Valores,
        onSave: async (v) => !!(await w.insert('plans', packPlan(v))),
      }),
    [hoja, camposPlan, w],
  )
  const editarPlan = useCallback(
    (pl: Row<'plans'>, pre: Partial<Valores> = {}) =>
      hoja.abrir({
        titulo: 'Editar idea',
        campos: camposPlan,
        valores: {
          text: pl.text,
          kind: pl.kind,
          status: pl.status,
          date: pl.date ?? '',
          place: pl.place ?? '',
          link: pl.link ?? '',
          notes: pl.notes ?? '',
          ...pre,
        } as Valores,
        onSave: (v) => w.update('plans', pl.id, packPlan(v)),
        onDelete: () => void w.remove('plans', [pl]),
      }),
    [hoja, camposPlan, w],
  )

  /* ---------- Comidas (una fila por día y comida) ---------- */
  const abrirComida = useCallback(
    (date: string, meal: Meal['meal']) => {
      const ex = meals.find((m) => m.date === date && m.meal === meal)
      hoja.abrir({
        titulo: `${MEAL_NAME[meal]} · ${fLong(date)}`,
        campos: [
          { k: 'text', label: 'Qué se come', t: 'text', ph: 'Tacos de pollo, sopa de lentejas…' },
          { k: 'ingredients', label: 'Ingredientes para el súper (separados por coma)', t: 'area' },
        ],
        valores: { text: ex?.text ?? '', ingredients: ex?.ingredients ?? '' },
        onDelete: ex ? () => void w.remove('meals', [ex]) : undefined,
        onSave: async (v) => {
          const text = orNull(s(v, 'text'))
          const ingredients = orNull(s(v, 'ingredients'))
          if (!text && !ingredients) {
            // Al vaciar platillo e ingredientes se borra la fila.
            if (ex) return w.remove('meals', [ex])
            return true
          }
          if (ex) return w.update('meals', ex.id, { text, ingredients })
          return !!(await w.insert('meals', { date, meal, text, ingredients }))
        },
      })
    },
    [hoja, meals, w],
  )

  /* ---------- Listas ---------- */
  const editarProducto = useCallback(
    (it: Row<'shopping_items'>) =>
      hoja.abrir({
        titulo: 'Editar producto',
        campos: [
          { k: 'text', label: 'Producto', t: 'text', req: true },
          { k: 'category', label: 'Sección', t: 'select', opts: CATS },
        ],
        valores: { text: it.text, category: it.category },
        onSave: (v) =>
          w.update('shopping_items', it.id, {
            text: s(v, 'text'),
            category: s(v, 'category') as Row<'shopping_items'>['category'],
          }),
        onDelete: () => void w.remove('shopping_items', [it]),
      }),
    [hoja, w],
  )
  const editarCompra = useCallback(
    (c: Row<'purchases'>) =>
      hoja.abrir({
        titulo: 'Editar compra',
        campos: [
          { k: 'text', label: 'Qué comprar', t: 'text', req: true },
          { k: 'price', label: 'Costo aprox.', t: 'money', mitad: true },
          { k: 'priority', label: 'Prioridad', t: 'select', opts: PRIO_OPTS, mitad: true },
          { k: 'store', label: 'Dónde (tienda o link)', t: 'text' },
        ],
        valores: {
          text: c.text,
          price: c.price != null ? String(c.price) : '',
          priority: c.priority,
          store: c.store ?? '',
        },
        onSave: (v) =>
          w.update('purchases', c.id, {
            text: s(v, 'text'),
            price: parsePrice(s(v, 'price')),
            priority: s(v, 'priority') as Row<'purchases'>['priority'],
            store: orNull(s(v, 'store')),
          }),
        onDelete: () => void w.remove('purchases', [c]),
      }),
    [hoja, w],
  )
  const editarMejora = useCallback(
    (m: Row<'home_improvements'>) =>
      hoja.abrir({
        titulo: 'Editar mejora',
        campos: [
          { k: 'text', label: 'Mejora', t: 'text', req: true },
          { k: 'area', label: 'Área', t: 'select', opts: AREAS.map((a) => [a, a]), mitad: true },
          { k: 'price', label: 'Costo estimado', t: 'money', mitad: true },
          {
            k: 'status',
            label: 'Estado',
            t: 'select',
            opts: STATUS_ORDER.map((st) => [st, STATUS_NAME[st]]),
          },
        ],
        valores: {
          text: m.text,
          area: m.area,
          price: m.price != null ? String(m.price) : '',
          status: m.status,
        },
        onSave: (v) =>
          w.update('home_improvements', m.id, {
            text: s(v, 'text'),
            area: s(v, 'area') as Row<'home_improvements'>['area'],
            price: parsePrice(s(v, 'price')),
            status: s(v, 'status') as Row<'home_improvements'>['status'],
          }),
        onDelete: () => void w.remove('home_improvements', [m]),
      }),
    [hoja, w],
  )

  /* ---------- Notas y contactos ---------- */
  const camposNota: Campo[] = useMemo(
    () => [
      { k: 'title', label: 'Título', t: 'text', req: true },
      { k: 'body', label: 'Nota', t: 'area', rows: 8 },
    ],
    [],
  )
  const nuevaNota = useCallback(
    () =>
      hoja.abrir({
        titulo: 'Nueva nota',
        campos: camposNota,
        valores: {},
        onSave: async (v) =>
          !!(await w.insert('notes', { title: s(v, 'title'), body: orNull(s(v, 'body')) })),
      }),
    [hoja, camposNota, w],
  )
  const editarNota = useCallback(
    (n: Row<'notes'>) =>
      hoja.abrir({
        titulo: 'Editar nota',
        campos: camposNota,
        valores: { title: n.title, body: n.body ?? '' },
        onSave: (v) =>
          w.update('notes', n.id, { title: s(v, 'title'), body: orNull(s(v, 'body')) }),
        onDelete: () => void w.remove('notes', [n]),
      }),
    [hoja, camposNota, w],
  )
  const camposContacto: Campo[] = useMemo(
    () => [
      { k: 'name', label: 'Nombre', t: 'text', req: true },
      {
        k: 'role',
        label: 'A qué se dedica',
        t: 'text',
        ph: 'Plomero, pediatra…',
        sugerencias: ROLES,
        mitad: true,
      },
      { k: 'phone', label: 'Teléfono', t: 'tel', mitad: true },
      { k: 'notes', label: 'Notas', t: 'area' },
    ],
    [],
  )
  const packContacto = (v: Valores) => ({
    name: s(v, 'name'),
    role: orNull(s(v, 'role')),
    phone: orNull(s(v, 'phone')),
    notes: orNull(s(v, 'notes')),
  })
  const nuevoContacto = useCallback(
    () =>
      hoja.abrir({
        titulo: 'Nuevo contacto',
        campos: camposContacto,
        valores: {},
        onSave: async (v) => !!(await w.insert('contacts', packContacto(v))),
      }),
    [hoja, camposContacto, w],
  )
  const editarContacto = useCallback(
    (c: Row<'contacts'>) =>
      hoja.abrir({
        titulo: 'Editar contacto',
        campos: camposContacto,
        valores: { name: c.name, role: c.role ?? '', phone: c.phone ?? '', notes: c.notes ?? '' },
        onSave: (v) => w.update('contacts', c.id, packContacto(v)),
        onDelete: () => void w.remove('contacts', [c]),
      }),
    [hoja, camposContacto, w],
  )

  /** Abre la hoja de cualquier entrada del calendario o de Inicio. */
  const abrirEntrada = useCallback(
    (e: Entry) => {
      if (e.kind === 'evento') {
        const r = events.find((x) => x.id === e.id)
        if (r) editarEvento(r)
      } else if (e.kind === 'pendiente') {
        const r = tasks.find((x) => x.id === e.id)
        if (r) editarPendiente(r)
      } else if (e.kind === 'fecha') {
        const r = dates.find((x) => x.id === e.id)
        if (r) editarFecha(r)
      } else if (e.kind === 'ninos') {
        const r = kids.find((x) => x.id === e.id)
        if (r) editarNino(r)
      } else if (e.kind === 'plan') {
        const r = plans.find((x) => x.id === e.id)
        if (r) editarPlan(r)
      } else if (e.kind === 'google') {
        // Los eventos de Google son de solo lectura: se abren en Google Calendar.
        const r = google.find((x) => x.id === e.id)
        if (r?.html_link) window.open(r.html_link, '_blank', 'noopener,noreferrer')
      } else {
        const r = meals.find((x) => x.id === e.id)
        if (r) abrirComida(r.date, r.meal)
      }
    },
    [
      events,
      tasks,
      dates,
      google,
      kids,
      plans,
      meals,
      editarEvento,
      editarPendiente,
      editarFecha,
      editarNino,
      editarPlan,
      abrirComida,
    ],
  )

  return {
    nuevoPendiente,
    editarPendiente,
    nuevoEvento,
    editarEvento,
    nuevaFecha,
    editarFecha,
    nuevoNino,
    editarNino,
    nuevoPlan,
    editarPlan,
    nuevaNota,
    editarNota,
    nuevoContacto,
    editarContacto,
    abrirComida,
    editarProducto,
    editarCompra,
    editarMejora,
    abrirEntrada,
  }
}
