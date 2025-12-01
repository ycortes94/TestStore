const testimonials = [
  {
    quote: 'Every drop launches with thoughtful layering ideas. It saves me hours each season.',
    author: 'Maya — Barre instructor',
  },
  {
    quote: 'Quality rivals the big luxury houses, but the edits are way more practical.',
    author: 'Leo — Product manager',
  },
]

const Testimonials = () => {
  return (
    <section className="testimonials">
      {testimonials.map((testimonial) => (
        <blockquote key={testimonial.author}>
          <p>“{testimonial.quote}”</p>
          <cite>{testimonial.author}</cite>
        </blockquote>
      ))}
    </section>
  )
}

export default Testimonials
