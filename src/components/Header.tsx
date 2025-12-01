type HeaderProps = {
  cartCount: number
}

const navLinks = ['New arrivals', 'Best sellers', 'Studio kits', 'Journal']

const Header = ({ cartCount }: HeaderProps) => {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo">TS</span>
        <div>
          <p className="eyebrow">Test Store</p>
          <strong>Essential gear for daily movement</strong>
        </div>
      </div>

      <nav className="app-header__nav">
        {navLinks.map((link) => (
          <button key={link} className="text-button" type="button">
            {link}
          </button>
        ))}
      </nav>

      <div className="app-header__actions">
        <button className="text-button" type="button">
          Support
        </button>
        <button className="pill-button" type="button">
          <span role="img" aria-label="account">
            🙂
          </span>
        </button>
        <button className="cart-chip" type="button">
          <span>Bag</span>
          <span className="cart-chip__count">{cartCount}</span>
        </button>
      </div>
    </header>
  )
}

export default Header
