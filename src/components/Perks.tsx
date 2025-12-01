const perks = [
  {
    title: 'Try at home',
    detail: 'Keep what you love for 30 days or send it back free.',
  },
  {
    title: 'Stylist support',
    detail: 'Chat with a human between 7a-7p PST on weekdays.',
  },
  {
    title: 'Lifetime repairs',
    detail: 'We fix seams, zippers, and trims on every core piece.',
  },
]

const Perks = () => {
  return (
    <section className="perks">
      {perks.map((perk) => (
        <article key={perk.title}>
          <h3>{perk.title}</h3>
          <p>{perk.detail}</p>
        </article>
      ))}
    </section>
  )
}

export default Perks
