import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHarvest } from './use-harvest';
import { initialState, LEGACY_STORAGE_KEY, savePlan, STORAGE_KEY, updateSettings, type AppState, type PlanFields } from '@/lib/harvest';

const fields: PlanFields = { crop: 'Alface', sale: 'Feira', customer: '', quantity: '', date: '2026-12-04', start: '13:00', end: '14:00', delivery: '16:00', notes: '' };
const rename = (s: AppState) => updateSettings(s, { farmName: 'Sítio' });

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('Persistência no navegador', () => {
  it('starts empty and saves when nothing was stored', async () => {
    const { result } = renderHook(useHarvest);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.state).toEqual(initialState());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual(initialState());
  });
  it('preserves plans through reload and clears them on explicit reset', async () => {
    const state = savePlan(initialState(), fields, 'p1');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const first = renderHook(useHarvest);
    await waitFor(() => expect(first.result.current.state).toEqual(state));
    first.unmount();
    const next = renderHook(useHarvest);
    await waitFor(() => expect(next.result.current.state).toEqual(state));
    act(() => next.result.current.reset());
    expect(next.result.current.state).toEqual(initialState());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual(initialState());
  });
  it('migrates the first demo format once', async () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ version: 1, forecast: 'initial', plans: [{ id: 'demo-alface', crop: 'Alface', sale: 'Feira', date: '2026-12-04', start: '13:00', end: '14:00', delivery: '16:00' }] }));
    const { result } = renderHook(useHarvest);
    await waitFor(() => expect(result.current.state.plans).toHaveLength(1));
    expect(result.current.state.plans[0]).toMatchObject({ id: 'demo-alface', status: 'planejado', customer: '' });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null').version).toBe(3);
  });
  it('keeps an invalid stored value intact and allows in-memory changes with warning', async () => {
    localStorage.setItem(STORAGE_KEY, 'invalid');
    const { result } = renderHook(useHarvest);
    await waitFor(() => expect(result.current.storageWarning).toBe(true));
    act(() => result.current.setState(rename));
    expect(result.current.state.settings.farmName).toBe('Sítio');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('invalid');
  });
  it('allows the session to continue when storage access fails', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    const { result } = renderHook(useHarvest);
    await waitFor(() => expect(result.current.storageWarning).toBe(true));
    act(() => result.current.setState(rename));
    expect(result.current.state.settings.farmName).toBe('Sítio');
  });
  it('replaces everything from a backup', async () => {
    const { result } = renderHook(useHarvest);
    await waitFor(() => expect(result.current.ready).toBe(true));
    const backup = savePlan(rename(initialState()), fields, 'b1');
    act(() => result.current.replace(backup));
    expect(result.current.state).toEqual(backup);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual(backup);
  });
});
