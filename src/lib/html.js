// Os packs do Foundry as vezes trazem a tabela de Dureza/HP/BT dentro da propria
// descricao do escudo. Como o app ja mostra esses numeros na tabela de campos,
// a embutida vira duplicidade — some so ela, o texto corrido fica intacto.

/** Remove todos os <table> de um HTML ja sanitizado. Devolve o resto igual. */
export function withoutTables(html) {
  if (!html || !html.includes('<table')) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const table of doc.body.querySelectorAll('table')) table.remove()
  return doc.body.innerHTML
}
