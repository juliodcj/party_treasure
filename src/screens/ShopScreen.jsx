import { useMemo } from 'react'
import ItemRow from '../components/ItemRow.jsx'
import Stepper from '../components/Stepper.jsx'
import { PriceBadges } from '../components/Coins.jsx'
import { ArrowRightIcon } from '../components/Icons.jsx'
import { useStore } from '../state/store.jsx'
import { CATEGORY_ORDER, categoryLabel } from '../data/catalog.js'
import { groupInventory, matchesContent, matchesFilters, matchesSearch, resolveItem } from '../lib/items.js'
import { toCopper } from '../lib/money.js'
import { plural } from '../lib/text.js'

export default function ShopScreen({ player, shop, filters, openId, onToggle }) {
  const { state, dispatch } = useStore()

  const stock = useMemo(() => {
    if (!shop) return []
    return shop.itemIds.map((itemId) => resolveItem(state, itemId)).filter(Boolean)
  }, [state, shop])

  const visible = stock.filter(
    (item) =>
      matchesSearch(item, filters.search) &&
      matchesFilters(item, filters) &&
      matchesContent(item, state.settings),
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
  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0)
  const walletCp = toCopper(player)
  const affordable = walletCp >= totalCp

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

      {CATEGORY_ORDER.map((id) =>
        grouped[id].length ? (
          <section key={id} style={{ display: 'contents' }}>
            <h2 className="group-title">{categoryLabel(id)}</h2>
            {grouped[id].map(({ item }) => {
              const qty = state.cart[item.id] ?? 0
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  priceInHead
                  open={openId === item.id}
                  onToggle={() => onToggle(item.id)}
                  cart={
                    qty > 0 ? (
                      <div className="item__cart-pill">
                        <Stepper
                          size={24}
                          value={qty}
                          canDec={qty > 0}
                          onDec={() => dispatch({ type: 'CART_SET', itemId: item.id, qty: qty - 1 })}
                          onInc={() => dispatch({ type: 'CART_SET', itemId: item.id, qty: qty + 1 })}
                          label="itens no carrinho"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="item__add-btn"
                        onClick={() => dispatch({ type: 'CART_SET', itemId: item.id, qty: 1 })}
                      >
                        Comprar
                      </button>
                    )
                  }
                />
              )
            })}
          </section>
        ) : null,
      )}

      {lines.length ? (
        <div className="shop-summary">
          <div className="shop-summary__row">
            <div className="shop-summary__col">
              <div className="shop-summary__label">Carteira</div>
              <PriceBadges totalCp={walletCp} />
            </div>
            <ArrowRightIcon />
            <div className="shop-summary__col shop-summary__col--right">
              <div className={`shop-summary__label${affordable ? '' : ' shop-summary__label--danger'}`}>
                Depois da compra
              </div>
              <PriceBadges totalCp={Math.max(0, walletCp - totalCp)} />
            </div>
          </div>
          <div className="shop-summary__divider" />
          <button
            type="button"
            className="shop-summary__buy"
            style={{ opacity: affordable ? 1 : 0.45 }}
            onClick={() => affordable && dispatch({ type: 'BUY_CART' })}
            aria-label={`Comprar ${plural(itemCount, 'item', 'itens')}`}
          >
            <span className="shop-summary__buy-label">Comprar {plural(itemCount, 'item', 'itens')}</span>
            <PriceBadges totalCp={totalCp} />
          </button>
        </div>
      ) : null}
    </>
  )
}
