import { useEffect, useMemo, useState } from 'react'
import ItemRow from '../components/ItemRow.jsx'
import Sheet from '../components/Sheet.jsx'
import Stepper from '../components/Stepper.jsx'
import { PriceBadges } from '../components/Coins.jsx'
import { ArrowRightIcon, CartIcon } from '../components/Icons.jsx'
import { useStore } from '../state/store.jsx'
import { CATEGORY_ORDER, categoryLabel } from '../data/catalog.js'
import { groupInventory, matchesContent, matchesFilters, matchesSearch, resolveItem } from '../lib/items.js'
import { toCopper } from '../lib/money.js'
import { plural } from '../lib/text.js'

export default function ShopScreen({ player, shop, filters, openId, onToggle }) {
  const { state, dispatch } = useStore()
  const [cartOpen, setCartOpen] = useState(false)

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

  // Esvaziou o carrinho (comprou, ou tirou o último item pelo stepper da
  // lista): não faz sentido manter a confirmação aberta em cima de nada.
  useEffect(() => {
    if (itemCount === 0) setCartOpen(false)
  }, [itemCount])

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
          <section className="list-group" key={id}>
            <h2 className="list-group__title">{categoryLabel(id)}</h2>
            <div className="list-rows">
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
                            onDec={() =>
                              dispatch({ type: 'CART_SET', itemId: item.id, qty: qty - 1 })
                            }
                            onInc={() =>
                              dispatch({ type: 'CART_SET', itemId: item.id, qty: qty + 1 })
                            }
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
            </div>
          </section>
        ) : null,
      )}

      {/* O resumo da compra deixou de cobrir a lista: mora atrás deste
          carrinho e só aparece quando se pede a confirmação. */}
      <button
        type="button"
        className="fab fab--cart"
        onClick={() => setCartOpen(true)}
        disabled={itemCount === 0}
        aria-label={
          itemCount === 0
            ? 'Carrinho vazio'
            : `Abrir carrinho com ${plural(itemCount, 'item', 'itens')}`
        }
      >
        <CartIcon size={22} />
        {itemCount > 0 ? <span className="fab__badge">{itemCount}</span> : null}
      </button>

      {cartOpen ? (
        <Sheet title="Carrinho" onClose={() => setCartOpen(false)}>
          <div className="cart__lines">
            {lines.map(({ item, qty }) => (
              <div className="cart__line" key={item.id}>
                <span className="cart__line-name">{item.name}</span>
                <PriceBadges totalCp={item.priceCp * qty} />
                <Stepper
                  size={24}
                  value={qty}
                  canDec={qty > 0}
                  onDec={() => dispatch({ type: 'CART_SET', itemId: item.id, qty: qty - 1 })}
                  onInc={() => dispatch({ type: 'CART_SET', itemId: item.id, qty: qty + 1 })}
                  label={`${item.name} no carrinho`}
                />
              </div>
            ))}
          </div>

          <div className="cart__wallet">
            <div className="cart__wallet-col">
              <div className="cart__label">Carteira</div>
              <PriceBadges totalCp={walletCp} />
            </div>
            <ArrowRightIcon />
            <div className="cart__wallet-col cart__wallet-col--right">
              <div className={`cart__label${affordable ? '' : ' cart__label--danger'}`}>
                Depois da compra
              </div>
              <PriceBadges totalCp={Math.max(0, walletCp - totalCp)} />
            </div>
          </div>

          <button
            type="button"
            className="cart__buy"
            disabled={!affordable}
            onClick={() => {
              dispatch({ type: 'BUY_CART' })
              setCartOpen(false)
            }}
            aria-label={`Comprar ${plural(itemCount, 'item', 'itens')}`}
          >
            <span className="cart__buy-label">Comprar {plural(itemCount, 'item', 'itens')}</span>
            <PriceBadges totalCp={totalCp} />
          </button>
        </Sheet>
      ) : null}
    </>
  )
}
