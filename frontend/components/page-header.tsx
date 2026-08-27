export function PageHeader({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker?: string;
  title: React.ReactNode;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-header min-w-0">
      <div className="page-header-copy min-w-0">
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1 className="page-title">{title}</h1>
        {lede ? <p className="page-lede">{lede}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
