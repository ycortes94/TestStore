import type { NavTabId } from '../nav'
import { NAV_TABS } from '../nav'

type HeaderProps = {
  cartCount: number
  activeTab: NavTabId
  onTabChange: (tab: NavTabId) => void
  onOpenCart: () => void
  onOpenProfile?: () => void
  onGoHome?: () => void
}

const Header = ({ cartCount, activeTab, onTabChange, onOpenCart, onOpenProfile, onGoHome }: HeaderProps) => {
  return (
    <header className="app-header">
      <button className="app-header__brand" type="button" onClick={onGoHome}>
        <span className="app-header__logo">TS</span>
        <div>
          <p className="eyebrow">Test Store</p>
          <strong>Essential gear for daily movement</strong>
        </div>
      </button>

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
        <button className="pill-button" type="button" onClick={onOpenProfile} aria-label="This device profile">
          <span role="img" aria-label="profile">
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
