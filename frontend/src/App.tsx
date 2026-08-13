import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCalculator } from "@/hooks/useCalculator";
import { Display } from "@/components/calculator/Display";
import { Keypad } from "@/components/calculator/Keypad";
import { HistoryPanel } from "@/components/calculator/HistoryPanel";

function App() {
  const { a, b, result, error, history, setA, setB, calculate } = useCalculator();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="grid gap-4 w-full max-w-3xl sm:grid-cols-[1fr_16rem]">
        <Card>
          <CardHeader className="font-mono text-sm text-muted-foreground">
            Calculator
          </CardHeader>
          <CardContent className="space-y-4">
            <Display result={result} error={error} />
            <Keypad
              a={a}
              b={b}
              onOperandChange={(operand, value) => (operand === "a" ? setA(value) : setB(value))}
              onCalculate={calculate}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="font-mono text-sm text-muted-foreground">
            History
          </CardHeader>
          <CardContent>
            <HistoryPanel history={history} onSelect={(r) => setA(String(r))} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
