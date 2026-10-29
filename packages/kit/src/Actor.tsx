import React from 'react';
import type { ActorPlacement } from '@papercut/schema';
import { emptyState } from './core/actions';
import { Mirror, Rot } from './core/Ink';
import { useFormat } from './core/format';
import { useCharacter, useShot, useTarget } from './core/ShotContext';
import { BASES, framingTransform, type Framing } from './characters/body';
import { Puppet } from './characters/Puppet';
import { PROPS, propIdOf } from './props';

/** Apply the horizontal-format overrides when rendering landscape. */
export const usePlacement = (a: ActorPlacement): ActorPlacement => {
  const { format } = useFormat();
  return format === 'horizontal' && a.landscape ? { ...a, ...a.landscape } : a;
};

const MissingActor: React.FC<{ label: string }> = ({ label }) => (
  <g>
    <rect x={-120} y={-80} width={240} height={80} fill="#7a1010" />
    <text x={0} y={-30} textAnchor="middle" fill="#fff" fontSize={22} fontFamily="monospace">
      {label}
    </text>
  </g>
);

/** A held prop drawn small in a character's hand (actor.params.holding = prop id). */
const Held: React.FC<{ id?: string; scale?: number }> = ({ id, scale = 0.6 }) => {
  const def = id ? PROPS[id] : undefined;
  if (!def) return null;
  return (
    <g transform={`scale(${scale})`}>
      <def.Component params={{}} state={emptyState()} />
    </g>
  );
};

export const Actor: React.FC<{ placement: ActorPlacement }> = ({ placement }) => {
  const a = usePlacement(placement);
  const spec = useCharacter(a.kind === 'character' ? a.ref : '');
  const isChar = a.kind === 'character';
  const base = spec ? (BASES[spec.base] ?? BASES.adult_m) : BASES.adult_m;
  const fr = isChar ? framingTransform(a.framing as Framing, base) : { anchor: [0, 0] as [number, number], scale: 1 };
  const s = fr.scale * (a.scale ?? 1);
  const state = useTarget(a.ref, a.x, s);
  const propDef = isChar ? undefined : PROPS[propIdOf(a.ref, a.params)];
  const pivot: [number, number] = isChar
    ? fr.anchor
    : ((state.pivot ? propDef?.pivots?.[state.pivot] : undefined) ?? [0, 0]);

  let body: React.ReactNode;
  if (isChar) {
    body = spec ? (
      <Puppet
        spec={spec}
        framing={a.framing as Framing}
        pose={a.pose}
        expression={a.expression}
        state={state}
        held={<Held id={a.params.holding} scale={a.params.holdScale} />}
      />
    ) : (
      <MissingActor label={`character? ${a.ref}`} />
    );
  } else {
    body = propDef ? <propDef.Component params={a.params} state={state} /> : <MissingActor label={`prop? ${a.ref}`} />;
  }

  return (
    <g
      transform={`translate(${a.x + state.dx} ${a.y + state.dy}) scale(${s * state.scale})`}
      opacity={state.opacity}
    >
      <Mirror on={!!a.flip}>
        <g transform={`translate(${-fr.anchor[0]} ${-fr.anchor[1]})`}>
          <Rot a={state.rot} cx={pivot[0]} cy={pivot[1]}>
            {body}
          </Rot>
        </g>
      </Mirror>
    </g>
  );
};

/** Every actor in the current shot placed on `layer`. */
export const ActorsOn: React.FC<{ layer: 'mid' | 'subject' | 'fg' }> = ({ layer }) => {
  const { shot } = useShot();
  return (
    <>
      {shot.actors
        .filter((x) => (x.layer ?? 'subject') === layer)
        .map((x, i) => (
          <Actor key={`${x.ref}-${i}`} placement={x} />
        ))}
    </>
  );
};
