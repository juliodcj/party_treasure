import { useEffect, useMemo, useState } from 'react'
import ItemCard from '../components/ItemCard.jsx'
import ItemFilters, { EMPTY_FILTERS } from '../components/ItemFilters.jsx'
import Stepper from '../components/Stepper.jsx'
import { useStore } from '../state/store.jsx'
import { canAfford } from '../state/reducer.js'
import { availableLevels, matchesFilters, matchesSearch, resolveItem } from '../lib/items.js'
import { formatCopper, toCopper } from '../lib/money.js'
import { plural } from '../lib/text.js'

export default function ShopScreen({ player }) {
  const { state, dispatch } = useStore()
  const [shopId, setShopId] = useState(state.shops[0]?.id ?? '')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [cart, setCart] = useState({}) // { itemId: qty }
  const [flash, setFlash] = useState(null)

  const shop = state.shops.find((current) => current.id === shopId) ?? state.shops[0]

  // Trocar de loja zera carrinho e filtros: são coisas da loja anterior.
  useEffect(() => {
    setCart({})
    setFilters(EMPTY_FILTERS)
  }, [shop?.id])

  const stock = useMemo(() => {
    if (!shop) return []
    return shop.itemIds.map((itemId) => resolveItem(state, itemId)).filter(Boolean)
  }, [state, shop])

  const visible = stock.filter(
    (item) => matchesSearch(item, filters.search) && matchesFilters(item, filters),
  )

  const lines = Object.entries(cart)
    .map(([itemId, qty]) => ({ item: resolveItem(state, itemId), qty }))
    .filter((line) => line.item && line.qty > 0)
  const totalCp = lines.reduce((sum, line) => sum + line.item.priceCp * line.qty, 0)
  const affordable = canAfford(player, totalCp)

  const buy = () => {
    if (!lines.length || !affordable) return
    dispatch({
      type: 'BUY',
      playerId: player.id,
      entries: lines.map((line) => ({ itemId: line.item.id, qty: line.qty })),
    })
    setCart({})
    setFlash(`Compra fechada: ${formatCopper(totalCp)} debitados de ${player.name}.`)
  }

  if (!shop) {
    return <div className="empty">Nenhuma loja cadastrada. O mestre cria as lojas na aba Mestre.</div>
  }

  return (
    <div className="stack">
      <label className="field">
        <span className="field__label">Loja</span>
        <select className="select" value={shop.id} onChange={(event) => setShopId(event.target.value)}>
          {state.shops.map((current) => (
            <option key={current.id} value={current.id}>
              {current.name}
            </option>
          ))}
        </select>
      </label>

      <div className="row">
        <span className="card__sub">
          Comprando como <strong>{player.name}</strong> · {formatCopper(toCopper(player))}
        </span>
      </div>

      <ItemFilters value={filters} onChange={setFilters} levels={availableLevels(stock)} placeholder="Buscar na loja…" />

      {flash ? <div className="notice notice--ok">{flash}</div> : null}

      {visible.length === 0 ? (
        <div className="empty">
          {stock.length === 0 ? 'Esta loja ainda não tem itens.' : 'Nenhum item bate com a busca.'}
        </div>
      ) : null}

      {visible.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          right={
            <Stepper
              value={cart[item.id] ?? 0}
              min={0}
              onChange={(qty) => {
                setFlash(null)
                setCart((current) => ({ ...current, [item.id]: qty }))
              }}
              label="itens no carrinho"
            />
          }
        />
      ))}

      {lines.length ? (
        <>
          <div className="checkout-spacer" aria-hidden="true" />
          <div className="checkout">
            <div className="total-bar">
              {plural(lines.reduce((sum, line) => sum + line.qty, 0), 'item', 'itens')}
              <span className="total-bar__value">{formatCopper(totalCp)}</span>
            </div>
            {!affordable ? (
              <div className="notice notice--error">
                Faltam {formatCopper(totalCp - toCopper(player))} para fechar essa compra.
              </div>
            ) : null}
            <div className="row">
              <button type="button" className="btn" onClick={() => setCart({})}>
                Limpar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1 }}
                onClick={buy}
                disabled={!affordable}
              >
                Comprar
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
