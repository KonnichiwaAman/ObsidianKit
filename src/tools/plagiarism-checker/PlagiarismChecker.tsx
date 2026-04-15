import { useMemo, useState } from "react";
import { FileSearch } from "lucide-react";

interface SimilarPair {
  i: number;
  j: number;
  score: number;
  first: string;
  second: string;
}

function tokenize(sentence: string) {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function jaccardSimilarity(a: string[], b: string[]) {
  const setA = new Set(a);
  const setB = new Set(b);

  const intersectionCount = [...setA].filter((item) => setB.has(item)).length;
  const unionCount = new Set([...setA, ...setB]).size;

  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

export default function PlagiarismChecker() {
  const [text, setText] = useState("");
  const [threshold, setThreshold] = useState(0.75);

  const analysis = useMemo(() => {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);

    const limitedSentences = sentences.slice(0, 200);
    const tokenized = limitedSentences.map(tokenize);

    const similarPairs: SimilarPair[] = [];
    const duplicateSentenceIndexes = new Set<number>();

    for (let i = 0; i < tokenized.length; i += 1) {
      if (tokenized[i].length < 4) continue;
      for (let j = i + 1; j < tokenized.length; j += 1) {
        if (tokenized[j].length < 4) continue;
        const score = jaccardSimilarity(tokenized[i], tokenized[j]);
        if (score >= threshold) {
          similarPairs.push({
            i,
            j,
            score,
            first: limitedSentences[i],
            second: limitedSentences[j],
          });
          duplicateSentenceIndexes.add(i);
          duplicateSentenceIndexes.add(j);
        }
      }
    }

    similarPairs.sort((a, b) => b.score - a.score);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const phraseLength = 5;
    const phraseCounts = new Map<string, number>();

    for (let i = 0; i <= words.length - phraseLength; i += 1) {
      const phrase = words.slice(i, i + phraseLength).join(" ");
      phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
    }

    const repeatedPhrases = [...phraseCounts.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase, count]) => ({ phrase, count }));

    const totalSentences = limitedSentences.length;
    const duplicateRate = totalSentences > 0 ? duplicateSentenceIndexes.size / totalSentences : 0;
    const originalityScore = Math.max(0, Math.round((1 - duplicateRate) * 100));

    return {
      totalSentences,
      analyzedSentences: limitedSentences.length,
      similarPairs: similarPairs.slice(0, 12),
      repeatedPhrases,
      duplicateSentenceCount: duplicateSentenceIndexes.size,
      originalityScore,
    };
  }, [text, threshold]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 space-y-3">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Text to Analyze</label>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={14}
          placeholder="Paste writing to analyze repeated sentences and duplicate phrasing..."
          className="w-full resize-y rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
        />

        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
            Similarity Threshold: {(threshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min={0.5}
            max={0.95}
            step={0.05}
            value={threshold}
            onChange={(event) => setThreshold(Number.parseFloat(event.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Originality score</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{analysis.originalityScore}%</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Sentences scanned</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{analysis.analyzedSentences}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Repeated sentences</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{analysis.duplicateSentenceCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Repeated phrases</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{analysis.repeatedPhrases.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <p className="inline-flex items-center gap-2 mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
          <FileSearch className="h-4 w-4 text-[var(--color-text-secondary)]" />
          Similar Sentence Pairs
        </p>
        <div className="space-y-3">
          {analysis.similarPairs.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">No high-similarity sentence pairs at the current threshold.</p>
          ) : (
            analysis.similarPairs.map((pair, index) => (
              <div key={`${pair.i}-${pair.j}`} className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-3">
                <p className="text-xs text-[var(--color-text-muted)]">Pair {index + 1} - Similarity {(pair.score * 100).toFixed(1)}%</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{pair.first}</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{pair.second}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Most Repeated Phrases</p>
        <div className="space-y-2">
          {analysis.repeatedPhrases.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">No repeated 5-word phrases detected.</p>
          ) : (
            analysis.repeatedPhrases.map((entry) => (
              <div key={entry.phrase} className="flex items-center justify-between rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)] break-all pr-3">{entry.phrase}</span>
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">x{entry.count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          This checker is a local similarity analyzer. It does not search the web and should be treated as a drafting aid, not a final plagiarism verdict.
        </p>
      </div>
    </div>
  );
}
