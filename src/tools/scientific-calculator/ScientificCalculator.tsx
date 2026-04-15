import { useState } from "react";
import { Calculator, Delete, Equal } from "lucide-react";

type AngleMode = "deg" | "rad";

interface HistoryItem {
  expression: string;
  result: string;
}

type BinaryOperator = "+" | "-" | "*" | "/" | "^";
type OperatorToken = BinaryOperator | "!" | "%";

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: OperatorToken }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma" };

const MAX_EXPRESSION_LENGTH = 512;

const BINARY_PRECEDENCE: Record<BinaryOperator, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "^": 3,
};

function isBinaryOperator(value: OperatorToken): value is BinaryOperator {
  return value === "+" || value === "-" || value === "*" || value === "/" || value === "^";
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("Factorial is defined for non-negative integers only.");
  }
  if (n > 170) {
    throw new Error("Number is too large for factorial.");
  }

  let product = 1;
  for (let i = 2; i <= n; i += 1) {
    product *= i;
  }
  return product;
}

function tokenizeExpression(rawExpression: string): Token[] {
  const expression = rawExpression
    .replace(/\u00f7/g, "/")
    .replace(/\u00d7/g, "*")
    .replace(/\u00d7/g, "*");

  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const current = expression[index];

    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(current)) {
      let end = index;
      let seenDecimal = false;

      while (end < expression.length) {
        const candidate = expression[end];
        if (candidate === ".") {
          if (seenDecimal) break;
          seenDecimal = true;
          end += 1;
          continue;
        }

        if (!/[0-9]/.test(candidate)) break;
        end += 1;
      }

      const rawNumber = expression.slice(index, end);
      if (rawNumber === ".") {
        throw new Error("Invalid number format.");
      }

      const value = Number.parseFloat(rawNumber);
      if (!Number.isFinite(value)) {
        throw new Error("Invalid numeric value.");
      }

      tokens.push({ type: "number", value });
      index = end;
      continue;
    }

    if (/[A-Za-z_]/.test(current)) {
      let end = index + 1;
      while (end < expression.length && /[A-Za-z0-9_]/.test(expression[end])) {
        end += 1;
      }

      tokens.push({ type: "identifier", value: expression.slice(index, end) });
      index = end;
      continue;
    }

    if (current === ",") {
      tokens.push({ type: "comma" });
      index += 1;
      continue;
    }

    if (current === "(" || current === ")") {
      tokens.push({ type: "paren", value: current });
      index += 1;
      continue;
    }

    if (current === "+" || current === "-" || current === "*" || current === "/" || current === "^" || current === "!" || current === "%") {
      tokens.push({ type: "operator", value: current });
      index += 1;
      continue;
    }

    throw new Error(`Expression contains unsupported character "${current}".`);
  }

  return tokens;
}

class ExpressionParser {
  private readonly tokens: Token[];
  private readonly angleMode: AngleMode;
  private index = 0;

  constructor(tokens: Token[], angleMode: AngleMode) {
    this.tokens = tokens;
    this.angleMode = angleMode;
  }

  parse(): number {
    const value = this.parseExpression(0);

    if (this.peek()) {
      throw new Error("Unexpected token in expression.");
    }

    return value;
  }

  private parseExpression(minPrecedence: number): number {
    let left = this.parseUnary();

    while (true) {
      const token = this.peek();
      if (!token || token.type !== "operator" || !isBinaryOperator(token.value)) {
        break;
      }

      const precedence = BINARY_PRECEDENCE[token.value];
      if (precedence < minPrecedence) {
        break;
      }

      const operator = token.value;
      this.consume();

      const nextMinPrecedence = operator === "^" ? precedence : precedence + 1;
      const right = this.parseExpression(nextMinPrecedence);
      left = this.applyBinaryOperator(operator, left, right);
    }

    return left;
  }

  private parseUnary(): number {
    const token = this.peek();
    if (token?.type === "operator" && (token.value === "+" || token.value === "-")) {
      this.consume();
      const value = this.parseUnary();
      return token.value === "-" ? -value : value;
    }

    return this.parsePostfix();
  }

  private parsePostfix(): number {
    let value = this.parsePrimary();

    while (true) {
      const token = this.peek();
      if (!token || token.type !== "operator") {
        break;
      }

      if (token.value === "!") {
        this.consume();
        value = factorial(value);
        continue;
      }

      if (token.value === "%") {
        this.consume();
        value /= 100;
        continue;
      }

      break;
    }

    return value;
  }

  private parsePrimary(): number {
    const token = this.peek();
    if (!token) {
      throw new Error("Expression ended unexpectedly.");
    }

    if (token.type === "number") {
      this.consume();
      return token.value;
    }

    if (token.type === "identifier") {
      return this.parseIdentifier(token.value);
    }

    if (token.type === "paren" && token.value === "(") {
      this.consume();
      const value = this.parseExpression(0);
      const closing = this.peek();

      if (!closing || closing.type !== "paren" || closing.value !== ")") {
        throw new Error("Missing closing parenthesis.");
      }

      this.consume();
      return value;
    }

    throw new Error("Unexpected token in expression.");
  }

  private parseIdentifier(rawName: string): number {
    const name = rawName.toLowerCase();
    this.consume();

    if (name === "pi") return Math.PI;
    if (name === "e") return Math.E;

    const maybeOpen = this.peek();
    if (!maybeOpen || maybeOpen.type !== "paren" || maybeOpen.value !== "(") {
      throw new Error(`Unknown token "${rawName}".`);
    }

    this.consume();
    const args = this.parseFunctionArgs();
    return this.callFunction(name, args);
  }

  private parseFunctionArgs(): number[] {
    const args: number[] = [];

    const immediateClose = this.peek();
    if (immediateClose?.type === "paren" && immediateClose.value === ")") {
      this.consume();
      return args;
    }

    while (true) {
      args.push(this.parseExpression(0));
      const separator = this.peek();

      if (separator?.type === "comma") {
        this.consume();
        continue;
      }

      if (separator?.type === "paren" && separator.value === ")") {
        this.consume();
        break;
      }

      throw new Error("Missing closing parenthesis in function call.");
    }

    return args;
  }

  private requireArgCount(name: string, args: number[], expected: number): number {
    if (args.length !== expected) {
      throw new Error(`${name}() expects ${expected} argument${expected === 1 ? "" : "s"}.`);
    }

    return args[0];
  }

  private toRadians(value: number): number {
    return this.angleMode === "deg" ? (value * Math.PI) / 180 : value;
  }

  private fromRadians(value: number): number {
    return this.angleMode === "deg" ? (value * 180) / Math.PI : value;
  }

  private callFunction(name: string, args: number[]): number {
    switch (name) {
      case "sin":
        return Math.sin(this.toRadians(this.requireArgCount("sin", args, 1)));
      case "cos":
        return Math.cos(this.toRadians(this.requireArgCount("cos", args, 1)));
      case "tan":
        return Math.tan(this.toRadians(this.requireArgCount("tan", args, 1)));
      case "asin":
        return this.fromRadians(Math.asin(this.requireArgCount("asin", args, 1)));
      case "acos":
        return this.fromRadians(Math.acos(this.requireArgCount("acos", args, 1)));
      case "atan":
        return this.fromRadians(Math.atan(this.requireArgCount("atan", args, 1)));
      case "sqrt":
        return Math.sqrt(this.requireArgCount("sqrt", args, 1));
      case "log":
        return Math.log10(this.requireArgCount("log", args, 1));
      case "ln":
        return Math.log(this.requireArgCount("ln", args, 1));
      case "abs":
        return Math.abs(this.requireArgCount("abs", args, 1));
      case "exp":
        return Math.exp(this.requireArgCount("exp", args, 1));
      case "factorial":
        return factorial(this.requireArgCount("factorial", args, 1));
      case "pow":
        if (args.length !== 2) {
          throw new Error("pow() expects 2 arguments.");
        }
        return Math.pow(args[0], args[1]);
      default:
        throw new Error(`Unsupported function "${name}".`);
    }
  }

  private applyBinaryOperator(operator: BinaryOperator, left: number, right: number): number {
    switch (operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "^":
        return left ** right;
      default:
        throw new Error("Unsupported operator.");
    }
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private consume(): Token {
    const token = this.tokens[this.index];
    if (!token) {
      throw new Error("Expression ended unexpectedly.");
    }

    this.index += 1;
    return token;
  }
}

function evaluateExpression(rawExpression: string, angleMode: AngleMode): number {
  if (!rawExpression.trim()) {
    throw new Error("Enter an expression.");
  }

  if (rawExpression.length > MAX_EXPRESSION_LENGTH) {
    throw new Error("Expression is too long.");
  }

  const tokens = tokenizeExpression(rawExpression);
  if (tokens.length === 0) {
    throw new Error("Enter an expression.");
  }

  const parser = new ExpressionParser(tokens, angleMode);
  const result = parser.parse();

  if (!Number.isFinite(result)) {
    throw new Error("Result is not finite.");
  }

  return result;
}

function formatResult(value: number) {
  if (Math.abs(value) >= 1e10 || (Math.abs(value) > 0 && Math.abs(value) < 1e-8)) {
    return value.toExponential(10).replace(/0+e/, "e").replace(/\.e/, "e");
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 12,
  });
}

const BUTTON_ROWS: string[][] = [
  ["7", "8", "9", "/", "sqrt("],
  ["4", "5", "6", "*", "pow("],
  ["1", "2", "3", "-", "("],
  ["0", ".", "%", "+", ")"],
  ["sin(", "cos(", "tan(", "log(", "ln("],
  ["asin(", "acos(", "atan(", "PI", "E_CONST"],
];

export default function ScientificCalculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [angleMode, setAngleMode] = useState<AngleMode>("deg");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  function appendToken(token: string) {
    const displayToken = token === "PI" ? "pi" : token === "E_CONST" ? "e" : token;
    setExpression((current) => `${current}${displayToken}`);
    setError(null);
  }

  function clearAll() {
    setExpression("");
    setResult("");
    setError(null);
  }

  function backspace() {
    setExpression((current) => current.slice(0, -1));
    setError(null);
  }

  function calculate() {
    try {
      const numericResult = evaluateExpression(expression, angleMode);
      const formatted = formatResult(numericResult);
      setResult(formatted);
      setError(null);
      setHistory((current) => [{ expression, result: formatted }, ...current].slice(0, 8));
    } catch (calculationError) {
      if (calculationError instanceof Error) {
        setError(calculationError.message);
      } else {
        setError("Could not evaluate expression.");
      }
      setResult("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
            <Calculator className="h-3.5 w-3.5" />
            Scientific Mode
          </div>
          <div className="inline-flex rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-1">
            <button
              onClick={() => setAngleMode("deg")}
              className={`rounded-md px-3 py-1 text-xs ${angleMode === "deg" ? "bg-[var(--color-bg-card)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
            >
              DEG
            </button>
            <button
              onClick={() => setAngleMode("rad")}
              className={`rounded-md px-3 py-1 text-xs ${angleMode === "rad" ? "bg-[var(--color-bg-card)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
            >
              RAD
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 mb-3">
          <input
            type="text"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            placeholder="Enter expression, for example sin(45)+sqrt(16)"
            className="w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
          />
          <p className="mt-2 min-h-[20px] text-xl font-semibold text-[var(--color-text-primary)]">
            {result || "0"}
          </p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="grid grid-cols-5 gap-2">
          {BUTTON_ROWS.flat().map((token) => (
            <button
              key={token}
              onClick={() => appendToken(token)}
              className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
            >
              {token === "PI" ? "pi" : token === "E_CONST" ? "e" : token}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={backspace}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <Delete className="h-3.5 w-3.5" />
            Backspace
          </button>
          <button
            onClick={clearAll}
            className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Clear
          </button>
          <button
            onClick={calculate}
            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-[var(--color-text-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-bg-primary)]"
          >
            <Equal className="h-3.5 w-3.5" />
            Evaluate
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
          <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Recent Calculations</p>
          <div className="space-y-2">
            {history.map((item, index) => (
              <div
                key={`${item.expression}-${index}`}
                className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2"
              >
                <p className="text-xs text-[var(--color-text-secondary)] break-all">{item.expression}</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">= {item.result}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
