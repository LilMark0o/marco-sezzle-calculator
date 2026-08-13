import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoryEntry } from "@/hooks/useCalculator";

interface HistoryPanelProps {
  history: HistoryEntry[];
  onSelect: (result: number) => void;
}

export function HistoryPanel({ history, onSelect }: HistoryPanelProps) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No calculations yet.</p>;
  }

  return (
    <ScrollArea className="h-64">
      <ul className="space-y-1">
        {history.map((entry, i) => (
          <li key={i}>
            <button
              className="w-full text-left rounded px-2 py-1 font-mono text-sm hover:bg-muted"
              onClick={() => onSelect(entry.result)}
            >
              {entry.expression} = {entry.result}
            </button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
