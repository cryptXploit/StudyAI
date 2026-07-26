// File: frontend/src/components/MoleculeViewer.tsx
'use client';

import React, { useEffect, useRef } from 'react';

export default function MoleculeViewer({ cid, style, spin, isReady }: { cid: string, style: string, spin: boolean, isReady: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const currentCidRef = useRef<string | null>(null);

  const styleRef = useRef(style);
  const spinRef = useRef(spin);

  useEffect(() => { styleRef.current = style; }, [style]);
  useEffect(() => { spinRef.current = spin; }, [spin]);

  useEffect(() => {
    if (!isReady || !cid || !containerRef.current || !(window as any).$3Dmol) return;

    if (!viewerRef.current) {
      viewerRef.current = (window as any).$3Dmol.createViewer(containerRef.current, { backgroundColor: '#f8fafc' });
    }

    const viewer = viewerRef.current;

    if (currentCidRef.current !== cid) {
      viewer.spin(false);
      viewer.clear();
      viewer.removeAllModels();

      (window as any).$3Dmol.download(`cid:${cid}`, viewer, {}, () => {
        currentCidRef.current = cid;
        
        const currentStyle = styleRef.current;
        const currentSpin = spinRef.current;

        if (currentStyle === 'stick') viewer.setStyle({}, { stick: { radius: 0.15 } });
        else if (currentStyle === 'sphere') viewer.setStyle({}, { sphere: {} });
        else viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.25 } });

        viewer.zoomTo();
        viewer.render();
        
        // Timeout buffers WebGL thread safely
        setTimeout(() => {
          if (spinRef.current && viewerRef.current) viewer.spin('y', 0.02);
        }, 100);
      });
    }
  }, [cid, isReady]); 

  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer && currentCidRef.current === cid) {
      if (style === 'stick') viewer.setStyle({}, { stick: { radius: 0.15 } });
      else if (style === 'sphere') viewer.setStyle({}, { sphere: {} });
      else viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.25 } });
      viewer.render();
    }
  }, [style, cid]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer && currentCidRef.current === cid) {
      if (spin) {
        viewer.spin('y', 0.02); 
      } else {
        viewer.spin(false);
      }
    }
  }, [spin, cid]);

  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.spin(false);
        viewerRef.current.clear();
      }
    };
  }, []);

  return (
    // Added absolute maximum dimensions to guarantee no WebGL grid collision reflows
    <div className="w-full h-[400px] md:h-[500px] min-h-[400px] md:min-h-[500px] block relative overflow-hidden">
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" 
      />
    </div>
  );
}
