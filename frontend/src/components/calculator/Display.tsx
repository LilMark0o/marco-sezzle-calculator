interface DisplayProps {
  result: number | null;
  error: string | null;
}

export function Display({ result, error }: DisplayProps) {
  return (
    <div className="rounded-md bg-muted p-4 text-right font-mono text-2xl min-h-16 flex items-center justify-end">
      {error ? (
        <span className="text-destructive text-base">{error}</span>
      ) : (
        <span>{result === null ? "0" : result}</span>
      )}
    </div>
  );
}
