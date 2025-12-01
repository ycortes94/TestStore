type HeroProps = {
  totalProducts: number
  onPrimaryAction?: () => void
}

const Hero = ({ totalProducts, onPrimaryAction }: HeroProps) => {
  return (
    <section className="hero">
      <p className="eyebrow">Test Store — Shipping carbon neutral since 2020</p>
      <div className="hero__content">
        <div>
          <h1>Outfit the next training cycle.</h1>
          <p>
            Curated apparel, footwear, and accessories dialed in by our in-house styling team.
            Every piece is fit-tested and ready to ship.
          </p>
          <div className="hero__actions">
            <button className="primary" type="button" onClick={onPrimaryAction}>
              Explore the edit
            </button>
            <button className="secondary" type="button">
              Book a fitting call
            </button>
          </div>
          <ul className="hero__metrics">
            <li>
              <strong>{totalProducts}</strong>
              <span>Pieces ready to ship</span>
            </li>
            <li>
              <strong>2 day</strong>
              <span>Average delivery time</span>
            </li>
            <li>
              <strong>4.8/5</strong>
              <span>Community rated</span>
            </li>
          </ul>
        </div>
        <aside className="hero__badge">
          <p className="eyebrow">Field Tested Capsule</p>
          <h2>Layer smart. Move better.</h2>
          <p>Mix fabrics that flex, breathe, and outlast the toughest session.</p>
          <div className="badge-grid">
            <span>Temperature control</span>
            <span>Machine washable</span>
            <span>UPF 40 finish</span>
            <span>Lifetime repair</span>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default Hero
