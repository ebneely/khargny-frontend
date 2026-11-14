'use client';
/* eslint-disable @next/next/no-img-element -- local previews of the person's own files (object URLs) */
// Proof on a correction or a report (contracts/api.md "Proof media"): up to 4 photos or short videos. Each file is checked
// on the device, then goes up on its own (POST /v1/corrections/media or /v1/reports/media, one multipart field `file`, the
// guest cookie) with a progress bar; a failed one can be tried again. The Send button reads the tokens from the form
// (data-media) and stays disabled while anything is uploading (useProofBusy).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { fill } from '@5argny/core/copy';
import { PROOF_MAX, proofProblem, proofCode, proofRetryable } from '@5argny/core/rules';
import { getApiBaseUrl } from '@/lib/config';
import { waitForGuestHandover } from '@/lib/api/guest-handover';
import { L } from './icons';
import { useK, haptic } from './KProvider';

type Item = { id: number; file: File; url: string; video: boolean; progress: number; token?: string; error?: string };
let seq = 0;

// how many uploads are running on the page (one form is open at a time): the Send buttons wait for 0
let busy = 0; const subs = new Set<() => void>();
const setBusy = (d: number) => { busy += d; subs.forEach((f) => f()); };
export const useProofBusy = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => busy > 0, () => false);

const videoSeconds = (url: string) => new Promise<number | undefined>((res) => {
  const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
  v.onloadedmetadata = () => res(Number.isFinite(v.duration) ? v.duration : undefined); v.onerror = () => res(undefined); v.src = url;
});

function upload(kind: 'corrections' | 'reports', file: File, onProgress: (f: number) => void) {
  return new Promise<string>(async (resolve, reject) => {
    const base = getApiBaseUrl(); if (base === '/api') await waitForGuestHandover();
    const form = new FormData(); form.append('file', file, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/v1/${kind}/media`); xhr.withCredentials = true; xhr.timeout = 120_000;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let body: { data?: { media?: string }; error?: { code?: string }; code?: string } | null = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      const token = body?.data?.media;
      if (xhr.status >= 200 && xhr.status < 300 && token) resolve(token); else reject(proofCode(body?.error?.code ?? body?.code));
    };
    xhr.onerror = xhr.ontimeout = () => reject('failed');
    xhr.send(form);
  });
}

export function ProofPicker({ kind }: { kind: 'corrections' | 'reports' }) {
  const { c } = useK();
  const [items, setItems] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const patch = (id: number, p: Partial<Item>) => setItems((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const send = (it: Item) => {
    patch(it.id, { progress: 0, error: undefined }); setBusy(1);
    upload(kind, it.file, (f) => patch(it.id, { progress: f }))
      .then((token) => patch(it.id, { token, progress: 1 }), (code: string) => patch(it.id, { error: code }))
      .finally(() => setBusy(-1));
  };
  const add = async (files: FileList | null) => {
    const room = PROOF_MAX - items.length;
    for (const file of [...(files ?? [])].slice(0, Math.max(0, room))) {
      const url = URL.createObjectURL(file), video = file.type.startsWith('video/') || /\.(mp4|mov)$/i.test(file.name);
      const problem = proofProblem(file, video ? await videoSeconds(url) : undefined);
      const it: Item = { id: ++seq, file, url, video, progress: 0, error: problem ?? undefined };
      setItems((l) => [...l, it]);
      if (!problem) send(it);
    }
    if (input.current) input.current.value = '';
  };
  // object URLs are released when the form goes away
  const all = useRef(items); all.current = items;
  useEffect(() => () => all.current.forEach((x) => URL.revokeObjectURL(x.url)), []);
  const e = c.proof.errors as Record<string, string>;
  const tokens = items.filter((x) => x.token).map((x) => x.token!);
  return (
    <div className="corr-proof" data-media={JSON.stringify(tokens)}>
      {items.length ? <div className="proof-list" aria-label={fill(c.proof.label, { n: PROOF_MAX })}>{items.map((x) => {
        const up = !x.token && !x.error, retry = !!x.error && proofRetryable(x.error);
        return <div key={x.id} className={`proof-item${x.error ? ' err' : ''}`}>
          <button type="button" className="proof-thumb press" disabled={!retry} aria-label={retry ? c.proof.retry : x.file.name} onClick={() => { haptic(); send(x); }}>
            {x.video ? <video src={`${x.url}#t=0.1`} muted playsInline preload="metadata" /> : <img decoding="async" src={x.url} alt="" onError={(ev) => { ev.currentTarget.style.visibility = 'hidden'; }} />}
            {x.video ? <span className="proof-kind"><L n="clapperboard" /></span> : null}
            {up ? <span className="proof-bar" role="progressbar" aria-label={c.proof.uploading} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(x.progress * 100)}><i style={{ transform: `scaleX(${x.progress})` }} /></span> : null}
            {retry ? <span className="proof-retry"><L n="rotate-ccw" /></span> : null}
          </button>
          <button type="button" className="proof-x press" aria-label={c.proof.remove} onClick={() => { haptic(); URL.revokeObjectURL(x.url); setItems((l) => l.filter((y) => y.id !== x.id)); }}><L n="x" /></button>
        </div>;
      })}</div> : null}
      {items.filter((x) => x.error).map((x) => <p key={x.id} className="proof-err t-small" role="alert">{x.file.name}: {e[x.error!] ?? e.failed}</p>)}
      {items.length < PROOF_MAX ? <button type="button" className="corr-photo press" data-act="corr-photo" onClick={() => input.current?.click()}><L n="image-plus" /><span>{c.proof.add}</span><em className="t-small">{c.common.optional}</em></button> : null}
      <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(ev) => void add(ev.currentTarget.files)} />
    </div>
  );
}
