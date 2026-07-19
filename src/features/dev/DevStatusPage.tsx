import { useEffect, useState } from "react";
import { CRITERIA, STRANDS, KS3_STRANDS } from "../../curriculum/criteria";
import { TEMPLATES, generateTask } from "../../engine";
import { hasKey } from "../../ai/gemini";
import { db } from "../../db/db";
import { PART_STRANDS } from "../../engine/mastery";
import { STAGES } from "../../mission/stages";
import { criteriaForPart } from "../../mission/parts";

const OP_SYMBOLS = /[+×÷=]|(?<=\d)\s*[-−]\s*(?=\d)/;

interface CritStatus {
  code: string;
  ok: boolean;
  error?: string;
}

export default function DevStatusPage() {
  const [seeded, setSeeded] = useState<boolean | null>(null);
  const [statuses, setStatuses] = useState<CritStatus[]>([]);

  useEffect(() => {
    void db.profiles.count().then((n) => setSeeded(n > 0));
    const result: CritStatus[] = CRITERIA.map((c) => {
      if (!TEMPLATES[c.code]) return { code: c.code, ok: false, error: "no template" };
      try {
        for (const tier of [1, 2, 3] as const) {
          const t = generateTask(c.code, tier, 42);
          if (!t.briefing || !t.answer) return { code: c.code, ok: false, error: `tier ${tier}: empty` };
          if (OP_SYMBOLS.test(t.briefing)) return { code: c.code, ok: false, error: `tier ${tier}: op symbol` };
        }
        return { code: c.code, ok: true };
      } catch (e) {
        return { code: c.code, ok: false, error: String(e) };
      }
    });
    setStatuses(result);
  }, []);

  const byCode = new Map(statuses.map((s) => [s.code, s]));
  const okCount = statuses.filter((s) => s.ok).length;
  const years = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <h1 className="text-2xl font-black text-cyan-200 neon">🛠 /dev/status</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="hud-panel p-3 text-center">
            <div className={`text-xl font-black ${okCount === CRITERIA.length ? "text-emerald-300" : "text-amber-300"}`}>
              {okCount}/{CRITERIA.length}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">criteria covered</div>
          </div>
          <div className="hud-panel p-3 text-center">
            <div className="text-xl font-black text-cyan-200">{Object.keys(TEMPLATES).length}</div>
            <div className="text-[10px] text-slate-400 uppercase">templates loaded</div>
          </div>
          <div className="hud-panel p-3 text-center">
            <div className={`text-xl font-black ${seeded ? "text-emerald-300" : "text-amber-300"}`}>
              {seeded === null ? "…" : seeded ? "seeded" : "empty"}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Dexie DB</div>
          </div>
          <div className="hud-panel p-3 text-center">
            <div className={`text-xl font-black ${hasKey() ? "text-emerald-300" : "text-amber-300"}`}>
              {hasKey() ? "active" : "fallback"}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Gemini key</div>
          </div>
        </div>

        {/* Strand × year grid */}
        <div className="hud-panel p-4 overflow-x-auto">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-3">Coverage map — strand × year</div>
          <table className="text-xs">
            <thead>
              <tr>
                <th className="text-left pr-3 text-slate-400 font-normal">Strand</th>
                {years.map((y) => (
                  <th key={y} className="px-2 text-slate-400 font-normal">Y{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...STRANDS, ...KS3_STRANDS].map((strand) => (
                <tr key={strand.id}>
                  <td className="pr-3 py-1 text-slate-300">{strand.label}</td>
                  {years.map((y) => {
                    const items = CRITERIA.filter((c) => c.strand === strand.id && c.year === y);
                    return (
                      <td key={y} className="px-2 py-1 align-top">
                        <div className="flex flex-wrap gap-1 max-w-[110px]">
                          {items.map((c) => {
                            const st = byCode.get(c.code);
                            return (
                              <span
                                key={c.code}
                                title={`${c.code}${st?.error ? ` — ${st.error}` : " ✅"}`}
                                className={`inline-block w-3.5 h-3.5 rounded-sm ${st?.ok ? "bg-emerald-400" : "bg-red-500"}`}
                              />
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Templates per part */}
        <div className="hud-panel p-4">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-3">Templates per rocket part</div>
          <div className="grid md:grid-cols-2 gap-2 text-xs text-slate-300">
            {STAGES.map((s) => {
              const codes = criteriaForPart(s.part);
              const withTemplates = codes.filter((c) => TEMPLATES[c]).length;
              return (
                <div key={s.part} className="flex justify-between border border-slate-700/60 rounded-lg px-3 py-1.5">
                  <span>
                    {s.emoji} {s.label}{" "}
                    <span className="text-slate-500">({PART_STRANDS[s.part].join("+")})</span>
                  </span>
                  <span className={withTemplates === codes.length ? "text-emerald-300" : "text-red-400"}>
                    {withTemplates}/{codes.length}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Failures */}
        {statuses.some((s) => !s.ok) && (
          <div className="hud-panel p-4 border-red-500/40">
            <div className="text-xs text-red-300 uppercase tracking-widest mb-2">Failures</div>
            {statuses
              .filter((s) => !s.ok)
              .map((s) => (
                <div key={s.code} className="text-xs text-red-300">
                  {s.code}: {s.error}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}