import { useMemo } from 'react'
import ItemRow from '../components/ItemRow.jsx'
import Stepper from '../components/Stepper.jsx'
import { CartIcon } from '../components/Icons.jsx'
import { useStore } from '../state/store.jsx'
import { GROUPS } from '../data/catalog.js'
import { groupInventory, matchesFilters, matchesSearch, resolveItem } from '../lib/items.js'
import { formatCopper, toCopper } from '../lib/money.js'

export default function ShopScreen({ player, shop, filters, openId, onToggle }) {
  const { state, dispatch } = useStore()

  const stock = useMemo(() => {
    if (!shop) return []
    return shop.itemIds.map((itemId) => resolveItem(state, itemId)).filter(Boolean)
  }, [state, shop])

  const visible = stock.filter(
    (item) => matchesSearch(item, filters.search) && matchesFilters(item, filters),
  )
  // A loja usa os mesmos grupos do inventário, para a lista ler igual.
  const grouped = useMemo(
    () => groupInventory(visible.map((item) => ({ item, qty: 0 }))),
    [visible],
  )

  const lines = Object.entries(state.cart)
    .map(([itemId, qty]) => ({ item: resolveItem(state, itemId), qty }))
    .filter((line) => line.item && line.qty > 0)
  const totalCp = lines.reduce((sum, line) => sum + line.item.priceCp * line.qty, 0)
  const affordable = toCopper(player) >= totalCp

  if (!shop) {
    return <div className="empty">Nenhuma loja cadastrada.{'\n'}O mestre cria as lojas na aba Mestre.</div>
  }

  return (
    <>
      {visible.length === 0 ? (
        <div className="empty">
          {stock.length === 0 ? 'Nenhum item disponível.' : 'Nenhum item encontrado.'}
        </div>
      ) : null}

      {GROUPS.map((group) =>
        grouped[group.id].length ? (
          <section key={group.id} style={{ display: 'contents' }}>
            <h2 className="group-title">{group.label}</h2>
            {grouped[group.id].map(({ item }) => {
              const qty = state.cart[item.id] ?? 0
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  priceInHead
                  open={openId === item.id}
                  onToggle={() => onToggle(item.id)}
                  cart={
                    <Stepper
                      size={24}
                      value={qty}
                      canDec={qty > 0}
                      onDec={() => dispatch({ type: 'CART_SET', itemId: item.id, qty: qty - 1 })}
                      onInc={() => dispatch({ type: 'CART_SET', itemId: item.id, qty: qty + 1 })}
                      label="itens no carrinho"
                    />
                  }
                />
              )
            })}
          </section>
        ) : null,
      )}

      {lines.length ? (
        <button
          type="button"
          className="fab fab--wide"
          style={{ opacity: affordable ? 1 : 0.5 }}
          onClick={() => affordable && dispatch({ type: 'BUY_CART' })}
          aria-label={`Comprar tudo por ${formatCopper(totalCp)}`}
        >
          <CartIcon />
          Comprar tudo · {formatCopper(totalCp)}
        </button>
      ) : null}
    </>
  )
}
