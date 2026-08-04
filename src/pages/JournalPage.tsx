import { useState } from 'react'

const POSTS = [
  {
    id: 'post-1',
    title: 'Why we lab-test every fabric batch',
    date: 'March 12',
    excerpt: 'Our QA loop blends abrasion drums with real-athlete wear panels so nothing ships blind.',
    body: 'Each textile spends 72 hours in controlled humidity before it earns a hang tag. When a batch fails, we rework the blend—not the marketing copy.',
  },
  {
    id: 'post-2',
    title: 'Designing for 5am runs and 9pm cool-downs',
    date: 'February 28',
    excerpt: 'Layering logic from our studio team: warmth without bulk when the schedule shifts.',
    body: 'We map heat maps from community runs in three climates, then tune trims so sleeves stay put when pace changes mid-session.',
  },
  {
    id: 'post-3',
    title: 'Packaging that stays out of the landfill',
    date: 'February 4',
    excerpt: 'Mushroom-based inserts and paper wraps are the default—here is how we track impact.',
    body: 'Quarterly, we publish recovery rates from our take-back bins and adjust glue formulas when recyclers flag contamination.',
  },
]

const JournalPage = () => {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <section className="tab-page" aria-labelledby="tab-journal-title">
      <div className="tab-page__heading">
        <p className="eyebrow">Editorial</p>
        <h2 id="tab-journal-title">Journal</h2>
        <p className="muted">Stories from the studio—expand a post to read the full note.</p>
      </div>

      <ul className="journal-list">
        {POSTS.map((post) => {
          const expanded = openId === post.id
          return (
            <li key={post.id} className="journal-card">
              <button
                type="button"
                className="journal-card__toggle"
                aria-expanded={expanded}
                onClick={() => setOpenId(expanded ? null : post.id)}
              >
                <span>
                  <strong>{post.title}</strong>
                  <span className="muted">{post.date}</span>
                </span>
                <span className="journal-card__chevron" aria-hidden>
                  {expanded ? '−' : '+'}
                </span>
              </button>
              <p className="journal-card__excerpt">{post.excerpt}</p>
              {expanded && <p className="journal-card__body">{post.body}</p>}
              <div className="journal-card__actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(post.title).catch(() => undefined)
                  }}
                >
                  Copy title
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default JournalPage
