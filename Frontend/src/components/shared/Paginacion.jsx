export default function Paginacion({ pagina, totalPaginas, onChange }) {
  if (totalPaginas <= 1) return null

  const paginas = []
  for (let i = 1; i <= totalPaginas; i++) paginas.push(i)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      gap: 4, padding: '12px 16px', borderTop: '1px solid var(--gray-100)',
    }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onChange(pagina - 1)}
        disabled={pagina === 1}
      >← Ant</button>

      {paginas.map((p) => (
        <button
          key={p}
          className="btn btn-sm"
          onClick={() => onChange(p)}
          style={{
            background: p === pagina ? 'var(--primary)' : 'transparent',
            color:      p === pagina ? '#fff' : 'var(--gray-600)',
            border:     p === pagina ? 'none' : '1px solid var(--gray-200)',
            minWidth: 32,
          }}
        >
          {p}
        </button>
      ))}

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onChange(pagina + 1)}
        disabled={pagina === totalPaginas}
      >Sig →</button>

      <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 8 }}>
        {pagina} / {totalPaginas}
      </span>
    </div>
  )
}
