type PhotoCreditProps = {
  item: {
    imageCredit?: string;
    imageSourceUrl?: string;
    imageLicense?: string;
    imageLicenseUrl?: string;
  };
};

const safeUrl = (value?: string) => {
  try {
    const parsed = new URL(value || '');
    return parsed.protocol === 'https:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
};

export default function PhotoCredit({ item }: PhotoCreditProps) {
  if (!item.imageCredit) return null;
  const source = safeUrl(item.imageSourceUrl);
  const license = safeUrl(item.imageLicenseUrl);
  return (
    <p className="mb-4 text-xs leading-5 text-ink/65 dark:text-cream/65">
      Photo: {source ? <a href={source} target="_blank" rel="noopener noreferrer" className="underline">{item.imageCredit}</a> : item.imageCredit}
      {item.imageLicense && <> · {license ? <a href={license} target="_blank" rel="noopener noreferrer" className="underline">{item.imageLicense}</a> : item.imageLicense}</>}
    </p>
  );
}
