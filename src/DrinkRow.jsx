export default function DrinkRow({ drink, quantity, onChange }) {
  const dec = () => onChange(Math.max(0, quantity - 1))
  const inc = () => onChange(quantity + 1)

  return (
    <div className={`drink-row ${quantity > 0 ? 'drink-row--active' : ''}`}>
      <div className="drink-row__label">
        <span className="drink-row__icon" aria-hidden="true">{drink.icon}</span>
        <span className="drink-row__name">{drink.name}</span>
      </div>
      <div className="stepper">
        <button
          type="button"
          className="stepper__btn"
          onClick={dec}
          aria-label={`Decrease ${drink.name}`}
          disabled={quantity === 0}
        >
          −
        </button>
        <span className="stepper__value" aria-live="polite">{quantity}</span>
        <button
          type="button"
          className="stepper__btn"
          onClick={inc}
          aria-label={`Increase ${drink.name}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
