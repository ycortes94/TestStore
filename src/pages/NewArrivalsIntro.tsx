type NewArrivalsIntroProps = {
  newDropsOnly: boolean
  onNewDropsOnlyChange: (value: boolean) => void
}

const NewArrivalsIntro = ({ newDropsOnly, onNewDropsOnlyChange }: NewArrivalsIntroProps) => {
  return (
    <section className="tab-page tab-page--intro" aria-labelledby="tab-new-arrivals-title">
      <div className="tab-page__heading">
        <p className="eyebrow">Just landed</p>
        <h2 id="tab-new-arrivals-title">New arrivals</h2>
        <p className="muted">Fresh drops from our design studio—filter below or focus on new tags only.</p>
      </div>
      <label className="tab-page__toggle">
        <input
          type="checkbox"
          checked={newDropsOnly}
          onChange={(event) => onNewDropsOnlyChange(event.target.checked)}
        />
        <span>Show only products tagged “new”</span>
      </label>
    </section>
  )
}

export default NewArrivalsIntro
