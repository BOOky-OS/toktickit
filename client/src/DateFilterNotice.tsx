type Props = {
  updatedSince: string;
  updatedBefore: string;
  resolvedSince: string;
  resolvedBefore: string;
  onClear: () => void;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function DateValue({ value }: { value: string }) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return <span>Invalid date</span>;
  return <time dateTime={value} title={value}>
    <span>{dateFormat.format(date)}</span>
    <span className="date-filter-time">{timeFormat.format(date)}</span>
  </time>;
}

export function DateFilterNotice({ updatedSince, updatedBefore, resolvedSince, resolvedBefore, onClear }: Props) {
  const ranges = [
    { label: "Updated", from: updatedSince, before: updatedBefore },
    { label: "Resolved", from: resolvedSince, before: resolvedBefore },
  ].filter(range => range.from || range.before);
  if (!ranges.length) return null;
  return <section className="date-filter-notice" aria-label="Active date filter">
    <div className="date-filter-content">
      <div className="date-filter-heading">
        <strong>Active date filter</strong>
        <span>Bangkok time · UTC+7</span>
      </div>
      {ranges.map(range => <div className="date-filter-range" key={range.label}>
        <span className="date-filter-kind">{range.label}</span>
        <dl>
          <div><dt>From</dt><dd><DateValue value={range.from} /></dd></div>
          <div><dt>Before</dt><dd><DateValue value={range.before} /></dd></div>
        </dl>
      </div>)}
    </div>
    <button type="button" className="zen-button zen-button--secondary date-filter-clear" onClick={onClear}>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" width="16" height="16" fill="none">
        <path d="m6 6 8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      Clear date filter
    </button>
  </section>;
}
