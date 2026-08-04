import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useModalA11y } from '../hooks/useModalA11y'

const TIME_SLOTS = [
  { value: '09:00', label: '9:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '17:00', label: '5:00 PM' },
] as const

export type FittingCallRequest = {
  name: string
  email: string
  preferredDate: string
  preferredTime: string
  notes: string
}

type FittingCallModalProps = {
  open: boolean
  onDismiss: (reason: 'cancel' | 'completed') => void
  onSchedule: (request: FittingCallRequest) => void
}

const emptyForm: {
  name: string
  email: string
  preferredDate: string
  preferredTime: string
  notes: string
} = {
  name: '',
  email: '',
  preferredDate: '',
  preferredTime: TIME_SLOTS[0].value,
  notes: '',
}

const FittingCallModal = ({ open, onDismiss, onSchedule }: FittingCallModalProps) => {
  const [form, setForm] = useState(emptyForm)
  const [scheduled, setScheduled] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setForm(emptyForm)
    setScheduled(false)
  }, [open])

  const handleDismiss = useCallback(() => {
    onDismiss(scheduled ? 'completed' : 'cancel')
  }, [onDismiss, scheduled])

  useModalA11y(open, handleDismiss)

  if (!open) {
    return null
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = form.name.trim()
    const email = form.email.trim()
    if (!name || !email || !form.preferredDate || !form.preferredTime) {
      return
    }

    onSchedule({
      name,
      email,
      preferredDate: form.preferredDate,
      preferredTime: form.preferredTime,
      notes: form.notes.trim(),
    })
    setScheduled(true)
  }

  const minDate = new Date().toISOString().slice(0, 10)
  const selectedSlotLabel =
    TIME_SLOTS.find((slot) => slot.value === form.preferredTime)?.label ?? form.preferredTime

  return (
    <div className="checkout-modal-backdrop" role="presentation" onClick={handleDismiss}>
      <div
        className="checkout-modal fitting-call-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fitting-call-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        {scheduled ? (
          <>
            <header className="checkout-modal__header">
              <p className="eyebrow">Fitting call booked</p>
              <h2 id="fitting-call-modal-title">You&apos;re on the calendar</h2>
              <p className="muted">
                We&apos;ll email {form.email.trim() || 'you'} a confirmation for {form.preferredDate} at{' '}
                {selectedSlotLabel}. Bring sizing goals and any pieces you want to try virtually.
              </p>
            </header>
            <div className="checkout-modal__actions">
              <button className="primary full-width" type="button" onClick={() => onDismiss('completed')}>
                Back to shopping
              </button>
            </div>
          </>
        ) : (
          <>
            <header className="checkout-modal__header">
              <p className="eyebrow">Personal styling</p>
              <h2 id="fitting-call-modal-title">Book a fitting call</h2>
              <p className="muted">
                20-minute virtual session with our styling team. We&apos;ll dial in fit, layering, and
                what to order next.
              </p>
            </header>

            <form className="fitting-call-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  required
                  data-autofocus
                  data-amp-mask="true"
                  className="amp-mask"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Alex Rivera"
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  data-amp-mask="true"
                  className="amp-mask"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="you@example.com"
                />
              </label>

              <div className="fitting-call-form__row">
                <label className="field">
                  <span>Preferred date</span>
                  <input
                    type="date"
                    name="preferredDate"
                    required
                    min={minDate}
                    value={form.preferredDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, preferredDate: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Time</span>
                  <select
                    name="preferredTime"
                    required
                    value={form.preferredTime}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, preferredTime: event.target.value }))
                    }
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Notes (optional)</span>
                <textarea
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Sizes you wear, sports you train for, pieces you already own…"
                />
              </label>

              <div className="checkout-modal__actions">
                <button className="secondary full-width" type="button" onClick={() => onDismiss('cancel')}>
                  Not now
                </button>
                <button className="primary full-width" type="submit">
                  Schedule fitting call
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default FittingCallModal
