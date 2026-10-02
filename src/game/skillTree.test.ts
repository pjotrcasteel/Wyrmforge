import { describe, expect, it } from 'vitest';
import { canRemoveNode, canSelectNode, getNode, spentPoints } from './skillTree';

describe('skill tree', () => {
  it('requires parent nodes before selecting deeper nodes', () => {
    expect(canSelectNode(getNode('fire-major'), new Set())).toBe(false);
    expect(canSelectNode(getNode('fire-major'), new Set(['fire-1', 'fire-2']))).toBe(true);
  });

  it('locks mutually exclusive paths', () => {
    const selected = new Set(['fire-1', 'fire-2', 'fire-major', 'wildfire']);
    expect(canSelectNode(getNode('detonation'), selected)).toBe(false);
  });

  it('allows only one legendary node', () => {
    const selected = new Set(['fire-1', 'fire-2', 'fire-major', 'wildfire', 'inferno', 'frost-1', 'frost-2', 'frost-major', 'deep-freeze']);
    expect(canSelectNode(getNode('absolute-zero'), selected)).toBe(false);
  });

  it('does not allow removing a node that has an active child', () => {
    const selected = new Set(['storm-1', 'storm-2']);
    expect(canRemoveNode(getNode('storm-1'), selected)).toBe(false);
    expect(canRemoveNode(getNode('storm-2'), selected)).toBe(true);
  });

  it('calculates spent points from node costs', () => {
    expect(spentPoints(new Set(['arcane-1', 'arcane-2', 'arcane-major']))).toBe(4);
  });
});
