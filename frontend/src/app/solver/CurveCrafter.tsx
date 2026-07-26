'use client';

import React, { useMemo, useState } from 'react';
import { Mafs, Coordinates, Plot, Theme } from 'mafs';
import * as math from 'mathjs';

// 🟢 FIXED: Next.js standard CSS import for Client Components
import 'mafs/core.css';
import 'mafs/font.css';

import { Activity } from 'lucide-react';

interface CurveCrafterProps {
  equation: string;
}

export default function CurveCrafter({ equation }: CurveCrafterProps) {
  const [sliderVal, setSliderVal] = useState(0);

  const mathFunction = useMemo(() => {
    try {
      const node = math.parse(equation);
      const code = node.compile();
      return (x: number) => {
        const val = code.evaluate({ x });
        return isNaN(val) ? 0 : val;
      };
    } catch (e) {
      console.error("Invalid Math Equation:", e);
      return (x: number) => 0; // Fallback
    }
  }, [equation]);

  const dynamicY = useMemo(() => mathFunction(sliderVal), [mathFunction, sliderVal]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl animate-in fade-in zoom-in duration-500 my-6">
      <div className="flex items-center gap-2 mb-4 text-indigo-400 font-black uppercase tracking-widest text-xs">
        <Activity size={16} />
        Curve Crafter
      </div>

      <div className="bg-slate-950 rounded-2xl p-2 border border-slate-800">
        <Mafs zoom={{ min: 0.1, max: 10 }} viewBox={{ x: [-5, 5], y: [-5, 5] }}>
          <Coordinates.Cartesian 
            xAxis={{ lines: 1, labels: (n) => (n % 1 === 0 ? n : "") }} 
            yAxis={{ lines: 1, labels: (n) => (n % 1 === 0 ? n : "") }} 
          />
          <Plot.OfX y={mathFunction} color={Theme.indigo} weight={3} />
          <Plot.OfX y={(x) => (x === sliderVal ? dynamicY : NaN)} style="dashed" color={Theme.pink} />
        </Mafs>
      </div>

      <div className="mt-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <p className="text-slate-300 font-bold text-sm">Interactive Value Explorer</p>
          <div className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-xs font-mono font-bold">
            f({sliderVal.toFixed(2)}) = {dynamicY.toFixed(4)}
          </div>
        </div>
        <input
          type="range"
          min="-5"
          max="5"
          step="0.1"
          value={sliderVal}
          onChange={(e) => setSliderVal(parseFloat(e.target.value))}
          className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-2">
          <span>x = -5</span>
          <span>x = 0</span>
          <span>x = 5</span>
        </div>
      </div>
    </div>
  );
}
