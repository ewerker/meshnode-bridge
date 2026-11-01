const linkClass = 'text-primary hover:underline';

export default function ContactBlock() {
  return (
    <div className="space-y-1 text-sm">
      <p>
        <span className="text-muted-foreground">Telefon:</span>{' '}
        <a href="tel:+4934293470571" className={linkClass}>+49 34293 470571</a>
      </p>
      <p>
        <span className="text-muted-foreground">Fax:</span>{' '}
        <a href="tel:+4934293470572" className={linkClass}>+49 34293 470572</a>
      </p>
      <p>
        <span className="text-muted-foreground">Notfälle:</span>{' '}
        <a href="tel:+1778337468" className={linkClass}>+1778337468</a>
      </p>
      <p>
        <span className="text-muted-foreground">E-Mail:</span>{' '}
        <a href="mailto:richter@w-2.de" className={linkClass}>richter@w-2.de</a>
      </p>
      <p>
        <span className="text-muted-foreground">Website:</span>{' '}
        <a href="https://w-2.de" target="_blank" rel="noopener noreferrer" className={linkClass}>https://w-2.de</a>
      </p>
    </div>
  );
}