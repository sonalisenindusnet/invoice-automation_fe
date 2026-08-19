// Small, presentational input wrappers shared by InvoiceRequestForm.
// Kept in one file since they're simple and only used by this form.

export function TextField({
  label,
  name,
  value,
  error,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  hint,
  optional,
  fullWidth,
  readOnly,
  prefix,
}) {
  const input = (
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onBlur={onBlur}
      readOnly={readOnly}
      className={readOnly ? 'field__input--readonly' : undefined}
    />
  );

  return (
    <div className={`field ${fullWidth ? 'field--full' : ''} ${error ? 'has-error' : ''}`}>
      <label htmlFor={name}>
        {label}
        {!optional && !readOnly && <span className="field__required">*</span>}
      </label>
      {prefix ? (
        <div className="field__input-group">
          <span className="field__prefix">{prefix}</span>
          {input}
        </div>
      ) : (
        input
      )}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

export function TextAreaField({ label, name, value, error, onChange, onBlur, placeholder, optional, fullWidth }) {
  return (
    <div className={`field ${fullWidth ? 'field--full' : ''} ${error ? 'has-error' : ''}`}>
      <label htmlFor={name}>
        {label}
        {!optional && <span className="field__required">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
      />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

export function CheckboxField({ label, name, checked, error, onChange, onBlur }) {
  return (
    <div className={`field field--checkbox field--full ${error ? 'has-error' : ''}`}>
      <label className="field__checkbox-label" htmlFor={name}>
        <input id={name} name={name} type="checkbox" checked={checked} onChange={onChange} onBlur={onBlur} />
        <span>{label}</span>
      </label>
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

// A small, single-line checkbox (checkbox + short label on one line) for
// slotting next to a TextField/SelectField in the grid without taking up a
// full field's worth of space.
export function InlineCheckboxField({ label, name, checked, disabled, onChange, hint, loading, loadingText, error }) {
  return (
    <div className={`field field--checkbox field--checkbox-compact ${error ? 'has-error' : ''}`}>
      <label className="field__checkbox-label" htmlFor={name}>
        <input id={name} name={name} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
        <span>{label}</span>
      </label>
      {loading ? (
        <span className="invoice-form__mis-loader">{loadingText}</span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

export function FileField({ label, name, inputRef, fileName, accept, error, onChange, hint, optional }) {
  return (
    <div className={`field field--full ${error ? 'has-error' : ''}`}>
      <label htmlFor={name}>
        {label}
        {!optional && <span className="field__required">*</span>}
      </label>
      <input id={name} name={name} type="file" ref={inputRef} accept={accept} onChange={onChange} />
      {fileName && <span className="field__hint">Selected: {fileName}</span>}
      {hint && !fileName && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

export function SelectField({ label, name, value, options, error, onChange, onBlur, optional }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={name}>
        {label}
        {!optional && <span className="field__required">*</span>}
      </label>
      <select id={name} name={name} value={value} onChange={onChange} onBlur={onBlur}>
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}
