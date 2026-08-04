import { useState, type FormEvent } from 'react'
import { trackEvent } from '../lib/analytics'
import { logStatsigEvent } from '../lib/statsig'

const FAQ = [
  {
    q: 'How fast do orders ship?',
    a: 'Most in-stock orders leave within one business day. You will get a tracking link as soon as the label is generated.',
  },
  {
    q: 'Can I exchange for a different size?',
    a: 'Yes—start an exchange from the order email within 60 days. We hold inventory for three days once a return is scanned.',
  },
  {
    q: 'Do you ship internationally?',
    a: 'We currently ship to the US and Canada. EU shipping is on the roadmap for late season.',
  },
] as const

const SupportPage = () => {
  const [topic, setTopic] = useState('orders')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!message.trim()) {
      return
    }
    trackEvent('support_ticket_submitted', { topic, messageLength: message.trim().length })
    logStatsigEvent('support_ticket_submitted', undefined, { topic, messageLength: message.trim().length })
    setSubmitted(true)
  }

  return (
    <div className="support-layout">
      <section className="tab-page" aria-labelledby="tab-support-title">
        <div className="tab-page__heading">
          <p className="eyebrow">Help desk</p>
          <h2 id="tab-support-title">Support</h2>
          <p className="muted">Test flows: pick a topic, send a note, or peek at FAQs.</p>
        </div>

        <form className="support-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Topic</span>
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option value="orders">Orders & shipping</option>
              <option value="returns">Returns & exchanges</option>
              <option value="product">Product questions</option>
              <option value="press">Press & partnerships</option>
            </select>
          </label>
          <label className="field">
            <span>Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder="What can we help with?"
              required
            />
          </label>
          <button className="primary" type="submit">
            Send message
          </button>
          {submitted && (
            <p className="support-form__success" role="status">
              Thanks—your note is recorded for this demo (no backend).
            </p>
          )}
        </form>
      </section>

      <section className="tab-page support-faq" aria-labelledby="faq-title">
        <h3 id="faq-title">Quick answers</h3>
        <ul className="faq-list">
          {FAQ.map((item, index) => {
            const expanded = openFaq === index
            return (
              <li key={item.q}>
                <button
                  type="button"
                  className="faq-item__question"
                  aria-expanded={expanded}
                  onClick={() => setOpenFaq(expanded ? null : index)}
                >
                  {item.q}
                  <span aria-hidden>{expanded ? '▴' : '▾'}</span>
                </button>
                {expanded && <p className="faq-item__answer">{item.a}</p>}
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          className="secondary full-width support-chat"
          onClick={() => {
            trackEvent('support_chat_opened', { source: 'support_page' })
            logStatsigEvent('support_chat_opened', undefined, { source: 'support_page' })
            alert('Demo: chat would open here.')
          }}
        >
          Start live chat (demo)
        </button>
      </section>
    </div>
  )
}

export default SupportPage
