import { useState, useMemo } from 'react'

const POR_PAGINA = 15

export function usePagination(items) {
  const [pagina, setPagina] = useState(1)

  const totalPaginas = Math.max(1, Math.ceil(items.length / POR_PAGINA))

  // Si el filtro reduce los items y la página actual queda vacía, volvemos a 1
  const paginaActual = Math.min(pagina, totalPaginas)

  const itemsPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * POR_PAGINA
    return items.slice(inicio, inicio + POR_PAGINA)
  }, [items, paginaActual])

  const resetPagina = () => setPagina(1)

  return { itemsPagina, pagina: paginaActual, setPagina, totalPaginas, resetPagina }
}
