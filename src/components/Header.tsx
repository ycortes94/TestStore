import type { NavTabId } from '../nav'
import { NAV_TABS } from '../nav'

type HeaderProps = {
  cartCount: number
  activeTab: NavTabId
  onTabChange: (tab: NavTabId) => void
  onOpenCart: () => void
}

const Header = ({ cartCount, activeTab, onTabChange, onOpenCart }: HeaderProps) => {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo">TS</span>
        <div>
          <p className="eyebrow">Test Store</p>
          <strong>Essential gear for daily movement</strong>
        </div>
      </div>

      <nav className="app-header__nav" aria-label="Main">
        <div role="tablist" className="app-header__tabs" aria-orientation="horizontal">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-trigger-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls="main-tab-panel"
              className={activeTab === tab.id ? 'app-header__tab is-active' : 'app-header__tab'}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="app-header__actions">
        <button className="pill-button" type="button">
          <span role="img" aria-label="account">
            🙂
          </span>
        </button>
        <button
          className="cart-chip"
          type="button"
          onClick={onOpenCart}
          aria-label={`Open bag, ${cartCount} items`}
        >
          <span>Bag</span>
          <span className="cart-chip__count">{cartCount}</span>
        </button>
      </div>
    </header>
  )
}

export default Header
