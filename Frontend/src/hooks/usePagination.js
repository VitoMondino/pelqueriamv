import { useState, useMemo } from 'react'

export function usePagination(items, perPage = 15) {
  const [pagina, setPagina] = useState(1)

  const totalPaginas  = Math.max(1, Math.ceil(items.length / perPage))
  const paginaActual  = Math.min(pagina, totalPaginas)

  const itemsPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * perPage
    return items.slice(inicio, inicio + perPage)
  }, [items, paginaActual, perPage])

  const resetPagina = () => setPagina(1)

  return { itemsPagina, pagina: paginaActual, setPagina, totalPaginas, resetPagina }
}
