import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Operation } from "@/hooks/useCalculator";

interface KeypadProps {
  a: string;
  b: string;
  onOperandChange: (operand: "a" | "b", value: string) => void;
  onCalculate: (operation: Operation) => void;
}

const BASIC_OPS: { op: Operation; label: string }[] = [
  { op: "add", label: "+" },
  { op: "subtract", label: "−" },
  { op: "multiply", label: "×" },
  { op: "divide", label: "÷" },
];

const ADVANCED_OPS: { op: Operation; label: string }[] = [
  { op: "power", label: "Aᵇ" },
  { op: "sqrt", label: "√" },
  { op: "percentage", label: "%" },
];

export function Keypad({ a, b, onOperandChange, onCalculate }: KeypadProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Input
          aria-label="First operand"
          value={a}
          onChange={(e) => onOperandChange("a", e.target.value)}
          placeholder="a"
        />
        <Input
          aria-label="Second operand"
          value={b}
          onChange={(e) => onOperandChange("b", e.target.value)}
          placeholder="b"
        />
      </div>
      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="grid grid-cols-4 gap-2 pt-2">
          {BASIC_OPS.map(({ op, label }) => (
            <Button key={op} variant="secondary" onClick={() => onCalculate(op)}>
              {label}
            </Button>
          ))}
        </TabsContent>
        <TabsContent value="advanced" className="grid grid-cols-3 gap-2 pt-2">
          {ADVANCED_OPS.map(({ op, label }) => (
            <Button key={op} variant="secondary" onClick={() => onCalculate(op)}>
              {label}
            </Button>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
