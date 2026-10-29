// World library animals and nature props in the diorama style (folk-pattern skin). Animals face left;
// flip them to face right. The head follows head_turn/nod (parts.head/headDy), legs follow
// walk_in_place (parts.legL/legR); idle motion (tails, wings, swaying) runs on 12 fps puppet time.
import React from 'react';
import { useDefs } from '../core/Filters';
import { Cutout, Gond, Patterned, Rot } from '../core/Ink';
import { seededRandom as rnd, shade } from '../core/math';
import { useShot } from '../core/ShotContext';
import { Diya, FolkPine, JEWEL, Palm, RoundTree } from '../sets/folkWorld';
import { basePivots, type PropDef, type PropProps } from './types';

const DARK = '#2a1a3a';
const CREAM = '#f6e3c0';

/** 12 fps quantised time, so idle motion steps like the puppets do. */
const useTq = () => Math.floor(useShot().t * 12) / 12;

/** A straight leg column from (x, top) to the ground, rotating at the top. */
const Column: React.FC<{ x: number; top: number; w: number; a: number; fill: string; foot?: string }> = ({
  x,
  top,
  w,
  a,
  fill,
  foot,
}) => (
  <g transform={`translate(${x} ${top})`}>
    <Rot a={a}>
      <Cutout>
        <path
          d={`M${-w / 2} 0 L${w / 2} 0 L${w / 2 - 2} ${-top - 14} Q${w / 2} ${-top} ${w / 2 - 8} ${-top} L${-w / 2 + 8} ${-top} Q${-w / 2} ${-top} ${-w / 2 + 2} ${-top - 14} Z`}
          fill={fill}
        />
        {foot && <rect x={-w / 2 + 2} y={-top - 22} width={w - 4} height={22} rx={6} fill={foot} />}
      </Cutout>
    </Rot>
  </g>
);

/* ------------------------------------------------------------------ elephant */

const Elephant: React.FC<PropProps> = ({ params, state }) => {
  const { url } = useDefs();
  const tq = useTq();
  const body = params.color ?? '#7a84a8';
  const back = shade(body, -0.14);
  const cloth = params.cloth ?? JEWEL.vermilion;
  const stride = state.parts.legL;
  const trunk = 4 * Math.sin(tq * 1.7);
  const ear = 3 * Math.sin(tq * 2.3);
  return (
    <>
      <Column x={-70} top={-210} w={70} a={-stride * 0.6} fill={back} foot={shade(back, 0.1)} />
      <Column x={250} top={-210} w={70} a={stride * 0.6} fill={back} foot={shade(back, 0.1)} />
      <g transform="translate(300 -330)">
        <Rot a={6 * Math.sin(tq * 2)}>
          <Cutout>
            <path d="M0 0 Q14 80 6 150 L16 150 Q26 80 10 -4 Z" fill={body} />
            <path d="M2 150 L22 150 L18 186 L6 186 Z" fill={DARK} />
          </Cutout>
        </Rot>
      </g>
      <Cutout>
        <path
          d="M-190 -240 C-200 -410 -60 -470 80 -460 C230 -450 312 -380 312 -260 C312 -192 270 -168 226 -168 L-150 -168 C-180 -172 -192 -204 -190 -240 Z"
          fill={body}
        />
        {/* jhool: the patterned saddle cloth */}
        <Gond
          d="M-40 -440 C40 -452 140 -446 210 -420 L230 -250 C150 -232 30 -232 -50 -246 Z"
          fill={cloth}
          dot={JEWEL.gold}
          cx={90}
          cy={-340}
          inset={0.86}
          gap={16}
          size={5}
        />
      </Cutout>
      <path
        d="M-50 -262 C30 -248 150 -248 230 -266 L232 -250 C150 -232 30 -232 -50 -246 Z"
        fill={JEWEL.gold}
      />
      <path
        d="M-46 -282 C30 -268 150 -268 228 -286 L230 -266 C150 -248 30 -248 -50 -262 Z"
        fill={url('zigzag-ink')}
        opacity={0.5}
      />
      <Column x={-130} top={-200} w={78} a={stride} fill={body} foot={shade(body, 0.12)} />
      <Column x={200} top={-200} w={78} a={-stride} fill={body} foot={shade(body, 0.12)} />
      <g transform={`translate(0 ${state.parts.headDy})`}>
        <Rot a={state.parts.head} cx={-170} cy={-330}>
          <Cutout>
            <g transform="translate(-300 -250)">
              <Rot a={trunk}>
                <path
                  d="M-30 0 C-46 70 -52 150 -30 210 C-24 228 6 226 0 204 C-14 150 -6 80 22 10 Z"
                  fill={body}
                />
                <path
                  d="M-36 60 l24 4 M-40 110 l24 2 M-38 160 l22 0"
                  stroke={shade(body, -0.2)}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              </Rot>
            </g>
            <path
              d="M-150 -430 C-210 -480 -320 -462 -344 -390 C-358 -340 -350 -282 -322 -250 C-290 -226 -220 -236 -160 -290 Z"
              fill={body}
            />
            <path d="M-300 -256 Q-336 -226 -372 -236 Q-338 -244 -316 -272 Z" fill={CREAM} />
            <path d="M-262 -452 L-232 -476 L-202 -452 L-232 -404 Z" fill={JEWEL.gold} />
            <circle cx={-232} cy={-440} r={9} fill={cloth} />
            <path d="M-306 -372 Q-292 -384 -276 -372 Q-292 -364 -306 -372 Z" fill={DARK} />
          </Cutout>
          <g transform="translate(-200 -400)">
            <Rot a={ear}>
              <Cutout>
                <Patterned
                  d="M0 0 C80 -24 128 60 98 136 C78 178 14 172 -10 128 Z"
                  fill={shade(body, 0.08)}
                  pattern="dots-cream"
                  opacity={0.35}
                />
              </Cutout>
            </Rot>
          </g>
        </Rot>
      </g>
    </>
  );
};

/* ------------------------------------------------------------------ cow */

const Cow: React.FC<PropProps> = ({ params, state }) => {
  const tq = useTq();
  const body = params.color ?? '#efe4d0';
  const back = shade(body, -0.12);
  const stride = state.parts.legL;
  return (
    <>
      <Column x={-110} top={-190} w={30} a={-stride * 0.6} fill={back} foot={DARK} />
      <Column x={180} top={-190} w={32} a={stride * 0.6} fill={back} foot={DARK} />
      <g transform="translate(232 -270)">
        <Rot a={8 * Math.sin(tq * 2.6)}>
          <Cutout>
            <path d="M0 0 Q16 70 8 150 L16 150 Q26 70 8 -4 Z" fill={body} />
            <path d="M2 146 Q-8 176 12 196 Q30 176 20 146 Z" fill={DARK} />
          </Cutout>
        </Rot>
      </g>
      <Cutout>
        <path
          d="M-200 -250 C-180 -300 -130 -306 -96 -298 C-80 -352 -18 -356 0 -306 C100 -312 210 -312 238 -268 C258 -228 246 -182 204 -172 L-160 -172 C-200 -182 -212 -222 -200 -250 Z"
          fill={body}
        />
        <Patterned
          d="M-60 -300 C20 -306 120 -306 180 -296 L170 -230 C90 -222 0 -222 -60 -232 Z"
          fill={JEWEL.marigold}
          pattern="dots-ink"
          opacity={0.25}
        />
        <path d="M-200 -240 Q-186 -150 -136 -196 Z" fill={back} />
      </Cutout>
      <Column x={-160} top={-182} w={34} a={stride} fill={body} foot={DARK} />
      <Column x={140} top={-182} w={36} a={-stride} fill={body} foot={DARK} />
      <g transform={`translate(0 ${state.parts.headDy})`}>
        <Rot a={state.parts.head} cx={-190} cy={-260}>
          <Cutout>
            <path d="M-226 -312 Q-250 -370 -214 -392 Q-238 -360 -212 -320 Z" fill={JEWEL.vermilion} />
            <path d="M-262 -314 Q-300 -366 -278 -396 Q-286 -360 -248 -322 Z" fill={JEWEL.gold} />
            <path
              d="M-180 -290 L-262 -304 C-304 -294 -316 -242 -304 -202 C-300 -186 -272 -184 -262 -200 L-196 -240 Z"
              fill={body}
            />
            <path d="M-308 -226 C-312 -206 -302 -192 -284 -194 L-270 -212 Z" fill="#d89a8a" />
            <path d="M-214 -300 L-170 -322 L-178 -290 Z" fill={back} />
            <path d="M-262 -272 Q-252 -282 -240 -272 Q-252 -266 -262 -272 Z" fill={DARK} />
          </Cutout>
          {/* marigold garland */}
          {Array.from({ length: 7 }, (_, i) => (
            <circle
              key={i}
              cx={-232 + i * 6}
              cy={-236 + Math.sin((i / 6) * Math.PI) * 40}
              r={9}
              fill={i % 2 ? JEWEL.marigold : JEWEL.vermilion}
            />
          ))}
        </Rot>
      </g>
    </>
  );
};

/* ------------------------------------------------------------------ peacock */

const Peacock: React.FC<PropProps> = ({ params, state }) => {
  const tq = useTq();
  const fan = params.fan ? 1 : 0;
  const blue = '#1f4fa0';
  const teal = '#1f8a7a';
  const eye = (x: number, y: number, r: number) => (
    <>
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.25} fill={JEWEL.gold} />
      <ellipse cx={x} cy={y} rx={r * 0.62} ry={r * 0.8} fill={teal} />
      <ellipse cx={x} cy={y + r * 0.1} rx={r * 0.34} ry={r * 0.44} fill={blue} />
    </>
  );
  const shiver = fan ? 1.5 * Math.sin(tq * 14) : 0;
  return (
    <>
      {fan ? (
        <g transform="translate(30 -170)">
          <Rot a={shiver}>
            <Cutout>
              {Array.from({ length: 15 }, (_, i) => {
                const a = (-170 + (i * 160) / 14) * (Math.PI / 180);
                const x = Math.cos(a) * 300;
                const y = Math.sin(a) * 300;
                return (
                  <path
                    key={i}
                    d={`M0 0 L${x * 0.95 - y * 0.08} ${y * 0.95 + x * 0.08} Q${x * 1.08} ${y * 1.08} ${x * 0.95 + y * 0.08} ${y * 0.95 - x * 0.08} Z`}
                    fill={i % 2 ? '#2a8a5a' : teal}
                  />
                );
              })}
            </Cutout>
            {Array.from({ length: 15 }, (_, i) => {
              const a = (-170 + (i * 160) / 14) * (Math.PI / 180);
              return (
                <React.Fragment key={i}>
                  {eye(Math.cos(a) * 270, Math.sin(a) * 270, 20)}
                  {i % 2 === 0 && eye(Math.cos(a) * 180, Math.sin(a) * 180, 14)}
                </React.Fragment>
              );
            })}
          </Rot>
        </g>
      ) : (
        <>
          <Cutout>
            <path
              d="M20 -150 C120 -120 260 -60 340 -14 Q350 -2 336 0 L260 0 C160 -40 60 -80 0 -110 Z"
              fill={teal}
            />
          </Cutout>
          {[
            [120, -100],
            [190, -64],
            [260, -30],
            [312, -10],
          ].map(([x, y], i) => (
            <React.Fragment key={i}>{eye(x, y, 13)}</React.Fragment>
          ))}
        </>
      )}
      <Cutout>
        <rect x={-14} y={-104} width={6} height={104} fill="#8a6a4a" />
        <rect x={10} y={-104} width={6} height={104} fill="#8a6a4a" />
        <path
          d="M-50 -160 C-50 -210 20 -220 60 -180 C90 -150 70 -100 20 -96 C-30 -94 -50 -120 -50 -160 Z"
          fill={blue}
        />
        <Patterned
          d="M-10 -180 C30 -190 64 -170 64 -140 C40 -120 0 -126 -14 -150 Z"
          fill="#c9a26a"
          pattern="lines-ink"
          opacity={0.4}
        />
      </Cutout>
      <g transform={`translate(0 ${state.parts.headDy + 4 * Math.abs(Math.sin(tq * 3))})`}>
        <Rot a={state.parts.head} cx={-30} cy={-180}>
          <Cutout>
            <path
              d="M-50 -170 C-62 -230 -52 -300 -40 -330 C-30 -352 -2 -352 -4 -326 C-10 -280 0 -220 -14 -170 Z"
              fill={blue}
            />
            <path d="M-46 -330 L-70 -322 L-44 -316 Z" fill="#d8b070" />
            <path d="M-34 -326 Q-26 -334 -18 -326 Q-26 -320 -34 -326 Z" fill={CREAM} />
            <circle cx={-26} cy={-326} r={3} fill={DARK} />
          </Cutout>
          {[-12, 0, 12].map((dx) => (
            <React.Fragment key={dx}>
              <path d={`M-24 -346 L${-24 + dx} -384`} stroke={blue} strokeWidth={3} />
              <circle cx={-24 + dx} cy={-386} r={6} fill={teal} />
            </React.Fragment>
          ))}
        </Rot>
      </g>
    </>
  );
};

/* ------------------------------------------------------------------ owl */

const Owl: React.FC<PropProps> = ({ params, state }) => {
  const { t } = useShot();
  const body = params.color ?? '#9a6a4a';
  // blinks every few seconds
  const blink = (t * 0.45) % 1 > 0.95 ? 1 : 0;
  return (
    <>
      <Cutout>
        <path
          d="M-80 -60 C-96 -160 -80 -240 0 -250 C80 -240 96 -160 80 -60 C70 -10 40 0 0 0 C-40 0 -70 -10 -80 -60 Z"
          fill={body}
        />
        <Gond
          d="M-46 -40 C-60 -110 -40 -170 0 -172 C40 -170 60 -110 46 -40 C30 -14 -30 -14 -46 -40 Z"
          fill={CREAM}
          dot={shade(body, -0.2)}
          cx={0}
          cy={-90}
          inset={0.75}
          gap={14}
          size={5}
        />
        <Patterned
          d="M-80 -150 C-120 -110 -110 -40 -70 -20 C-60 -60 -60 -110 -80 -150 Z"
          fill={shade(body, -0.18)}
          pattern="dots-cream"
          opacity={0.5}
        />
        <Patterned
          d="M80 -150 C120 -110 110 -40 70 -20 C60 -60 60 -110 80 -150 Z"
          fill={shade(body, -0.18)}
          pattern="dots-cream"
          opacity={0.5}
        />
        <path
          d="M-30 0 l-10 14 M-20 0 l0 16 M20 0 l0 16 M30 0 l10 14"
          stroke={JEWEL.ochreDark}
          strokeWidth={6}
          strokeLinecap="round"
        />
      </Cutout>
      <g transform={`translate(0 ${state.parts.headDy})`}>
        <Rot a={state.parts.head} cx={0} cy={-200}>
          <Cutout>
            <path
              d="M-84 -210 C-90 -280 -60 -320 0 -320 C60 -320 90 -280 84 -210 C70 -180 -70 -180 -84 -210 Z"
              fill={body}
            />
            <path d="M-80 -300 L-96 -350 L-50 -316 Z" fill={body} />
            <path d="M80 -300 L96 -350 L50 -316 Z" fill={body} />
            {[-36, 36].map((x) => (
              <React.Fragment key={x}>
                <circle cx={x} cy={-250} r={32} fill={JEWEL.gold} />
                {blink ? (
                  <path d={`M${x - 26} -250 L${x + 26} -250`} stroke={DARK} strokeWidth={6} />
                ) : (
                  <circle cx={x} cy={-250} r={15} fill={DARK} />
                )}
              </React.Fragment>
            ))}
            <path d="M-10 -232 L10 -232 L0 -206 Z" fill={JEWEL.ochreDark} />
          </Cutout>
        </Rot>
      </g>
    </>
  );
};

/* ------------------------------------------------------------------ crow */

const Crow: React.FC<PropProps> = ({ state }) => {
  const { t } = useShot();
  const tq = useTq();
  // a hop every ~2 s, and the beak opens on a caw just after it
  const ph = (t * 0.5) % 1;
  const hop = ph < 0.12 ? Math.sin((ph / 0.12) * Math.PI) * 18 : 0;
  const caw = ph > 0.3 && ph < 0.42 ? 1 : 0;
  const black = '#22202e';
  return (
    <g transform={`translate(0 ${-hop})`}>
      <Cutout>
        <path d="M-6 -60 L-14 0 M14 -60 L10 0" stroke="#4a4050" strokeWidth={5} />
        <path
          d="M-60 -100 C-60 -150 0 -160 50 -130 C90 -110 120 -100 150 -80 L140 -70 C110 -76 80 -70 50 -60 C0 -46 -60 -60 -60 -100 Z"
          fill={black}
        />
        <path d="M-10 -120 C30 -126 80 -110 120 -84 C80 -86 40 -80 -6 -86 Z" fill="#3a3a5a" />
      </Cutout>
      <g transform={`translate(0 ${state.parts.headDy})`}>
        <Rot a={state.parts.head + 3 * Math.sin(tq * 4)} cx={-50} cy={-110}>
          <Cutout>
            <circle cx={-64} cy={-136} r={30} fill={black} />
            <path d={`M-90 -146 L-128 ${-136 - caw * 6} L-90 -132 Z`} fill="#3a3a4a" />
            {caw ? <path d="M-90 -130 L-124 -118 L-92 -126 Z" fill="#3a3a4a" /> : null}
            <circle cx={-72} cy={-144} r={5} fill={CREAM} />
          </Cutout>
        </Rot>
      </g>
    </g>
  );
};

/* ------------------------------------------------------------------ cobra */

const Cobra: React.FC<PropProps> = ({ params }) => {
  const tq = useTq();
  const c = params.color ?? '#3a6a4a';
  const sway = 6 * Math.sin(tq * 1.8);
  return (
    <>
      <Cutout>
        <ellipse cx={20} cy={-24} rx={130} ry={30} fill={shade(c, -0.15)} />
        <ellipse cx={-10} cy={-44} rx={96} ry={26} fill={c} />
      </Cutout>
      <Rot a={sway} cx={-20} cy={-50}>
        <Cutout>
          <path d="M-60 -50 C-70 -140 -10 -200 -30 -280 L0 -280 C24 -200 -30 -140 -20 -50 Z" fill={c} />
          <Gond
            d="M-14 -270 C-80 -290 -84 -380 -40 -420 C-24 -436 -4 -436 12 -420 C56 -380 52 -290 -14 -270 Z"
            fill={c}
            dot={JEWEL.gold}
            cx={-14}
            cy={-350}
            inset={0.8}
            gap={13}
            size={4}
          />
          <path
            d="M-36 -360 Q-26 -340 -14 -360 Q-2 -340 8 -360 Q4 -330 -14 -330 Q-32 -330 -36 -360 Z"
            fill={CREAM}
          />
          <path d="M-36 -430 C-40 -460 12 -460 8 -430 Z" fill={shade(c, 0.1)} />
          <circle cx={-22} cy={-440} r={4} fill={JEWEL.gold} />
          <circle cx={-2} cy={-440} r={4} fill={JEWEL.gold} />
          {Math.sin(tq * 5) > 0.6 && (
            <path
              d="M-14 -460 L-14 -480 L-22 -490 M-14 -480 L-6 -490"
              stroke={JEWEL.vermilion}
              strokeWidth={3}
              fill="none"
            />
          )}
        </Cutout>
      </Rot>
    </>
  );
};

/* ------------------------------------------------------------------ flock */

/** A loose V of small birds flying left, wings flapping; drifts with time. Origin = flock centre. */
const Flock: React.FC<PropProps> = ({ params }) => {
  const { t } = useShot();
  const tq = useTq();
  const n = params.count ?? 7;
  const col = params.color ?? DARK;
  const drift = -(params.speed ?? 60) * t;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const k = Math.ceil(i / 2);
        const x = drift + k * 70 + rnd(i) * 20;
        const y = side * k * 40 + rnd(i + 4) * 16;
        const f = Math.sin(tq * 9 + i * 1.7);
        const w = 26;
        return (
          <path
            key={i}
            d={`M${x - w} ${y - f * 14} Q${x - w / 2} ${y - 6} ${x} ${y + 4} Q${x + w / 2} ${y - 6} ${x + w} ${y - f * 14} Q${x + w / 2} ${y + 2} ${x} ${y + 10} Q${x - w / 2} ${y + 2} ${x - w} ${y - f * 14} Z`}
            fill={col}
          />
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ dog */

/** Indian street dog (pariah): lean, tan, curled tail that wags; ears prick on head_turn. */
const Dog: React.FC<PropProps> = ({ params, state }) => {
  const tq = useTq();
  const body = params.color ?? '#c8904a';
  const back = shade(body, -0.14);
  const stride = state.parts.legL;
  return (
    <>
      <Column x={-80} top={-120} w={22} a={-stride * 0.7} fill={back} />
      <Column x={110} top={-120} w={24} a={stride * 0.7} fill={back} />
      <g transform="translate(150 -170)">
        <Rot a={14 * Math.sin(tq * 9)}>
          <Cutout>
            <path d="M0 0 C30 -10 60 -40 50 -80 C44 -96 26 -92 30 -76 C36 -50 20 -26 -6 -14 Z" fill={body} />
          </Cutout>
        </Rot>
      </g>
      <Cutout>
        <path
          d="M-130 -150 C-120 -196 -60 -200 0 -192 C80 -186 150 -196 168 -160 C178 -136 160 -114 130 -112 C60 -104 -10 -96 -60 -110 C-104 -112 -136 -122 -130 -150 Z"
          fill={body}
        />
        <path d="M-90 -116 C-40 -100 40 -100 110 -112 L100 -106 C40 -96 -40 -94 -90 -110 Z" fill={CREAM} />
      </Cutout>
      <Column x={-110} top={-118} w={24} a={stride} fill={body} />
      <Column x={140} top={-118} w={26} a={-stride} fill={body} />
      <g transform={`translate(0 ${state.parts.headDy})`}>
        <Rot a={state.parts.head} cx={-120} cy={-170}>
          <Cutout>
            <path
              d="M-110 -150 C-130 -190 -150 -220 -170 -236 L-150 -246 C-120 -226 -96 -196 -84 -160 Z"
              fill={body}
            />
            <path
              d="M-150 -236 C-176 -250 -214 -244 -236 -226 L-262 -214 C-270 -204 -262 -194 -250 -194 L-214 -196 C-190 -192 -160 -200 -146 -212 Z"
              fill={body}
            />
            <path d="M-174 -246 L-168 -284 L-148 -244 Z" fill={back} />
            <path d="M-268 -214 L-258 -220 L-256 -206 Z" fill={DARK} />
            <path d="M-210 -228 Q-202 -234 -194 -228 Q-202 -224 -210 -228 Z" fill={DARK} />
          </Cutout>
        </Rot>
      </g>
    </>
  );
};

/* ------------------------------------------------------------------ horse */

/** Horse in profile facing left, with a mane, a patterned saddle cloth (params.saddle) and a swishing tail. */
const Horse: React.FC<PropProps> = ({ params, state }) => {
  const { url } = useDefs();
  const tq = useTq();
  const body = params.color ?? '#7a4a2a';
  const back = shade(body, -0.16);
  const mane = params.mane ?? '#2a1a14';
  const stride = state.parts.legL;
  return (
    <>
      <Column x={-150} top={-250} w={34} a={-stride * 0.7} fill={back} foot={DARK} />
      <Column x={190} top={-250} w={36} a={stride * 0.7} fill={back} foot={DARK} />
      <g transform="translate(250 -380)">
        <Rot a={8 * Math.sin(tq * 2.4)}>
          <Cutout>
            <path d="M0 0 C40 20 60 90 40 200 C36 220 14 216 16 196 C30 110 20 50 -6 20 Z" fill={mane} />
          </Cutout>
        </Rot>
      </g>
      <Cutout>
        <path
          d="M-200 -330 C-190 -410 -80 -420 40 -410 C160 -404 260 -420 270 -350 C276 -290 240 -250 190 -246 L-160 -246 C-200 -256 -210 -290 -200 -330 Z"
          fill={body}
        />
      </Cutout>
      {params.saddle !== false && (
        <>
          <Cutout>
            <path
              d="M-60 -414 L120 -412 L130 -290 L-70 -292 Z"
              fill={params.saddleColor ?? JEWEL.vermilion}
            />
            <path d="M-20 -440 Q30 -460 80 -440 L84 -412 L-24 -412 Z" fill="#5a3420" />
          </Cutout>
          <path d="M-70 -312 L130 -310 L130 -290 L-70 -292 Z" fill={JEWEL.gold} />
          <path d="M-60 -414 L120 -412 L130 -290 L-70 -292 Z" fill={url('dots-gold')} opacity={0.4} />
        </>
      )}
      <Column x={-190} top={-246} w={38} a={stride} fill={body} foot={DARK} />
      <Column x={150} top={-246} w={40} a={-stride} fill={body} foot={DARK} />
      <g transform={`translate(0 ${state.parts.headDy})`}>
        <Rot a={state.parts.head} cx={-180} cy={-360}>
          <Cutout>
            <path
              d="M-150 -380 C-180 -440 -220 -520 -240 -560 L-180 -580 C-150 -520 -110 -460 -90 -400 Z"
              fill={body}
            />
            <path
              d="M-236 -560 C-260 -580 -300 -560 -330 -500 L-350 -450 C-356 -432 -340 -420 -324 -424 L-290 -440 C-262 -460 -226 -500 -196 -540 Z"
              fill={body}
            />
            <path d="M-216 -584 L-206 -626 L-188 -578 Z" fill={back} />
            <path
              d="M-196 -586 C-170 -560 -140 -500 -110 -420 C-100 -400 -120 -396 -128 -414 C-150 -470 -180 -530 -210 -570 Z"
              fill={mane}
            />
            <path d="M-276 -520 Q-266 -528 -256 -520 Q-266 -514 -276 -520 Z" fill={DARK} />
            <path d="M-344 -448 L-332 -456 L-330 -442 Z" fill={DARK} />
          </Cutout>
        </Rot>
      </g>
    </>
  );
};

/* ------------------------------------------------------------------ nature props (world library) */

const COLORS = 'canopy colour (#hex), default by time of day';

export const ANIMALS: PropDef[] = [
  {
    id: 'elephant',
    description:
      'Indian elephant in profile facing left, wearing a patterned vermilion saddle cloth (jhool) and a gold forehead ornament; trunk and ears sway, tail swishes. head_turn/nod move the head, walk_in_place steps the legs.',
    params: { color: 'hide colour (#hex)', cloth: 'saddle cloth colour (#hex)' },
    bbox: [-380, -480, 720, 490],
    pivots: basePivots(300),
    origin: 'ground under the middle of the body',
    Component: (p) => <Elephant {...p} />,
  },
  {
    id: 'cow',
    description:
      'Zebu cow (white, humped) in profile facing left, painted horns and a marigold garland, patterned back cloth; tail swishes. head_turn/nod move the head, walk_in_place steps the legs.',
    params: { color: 'hide colour (#hex)' },
    bbox: [-320, -400, 580, 410],
    pivots: basePivots(230),
    origin: 'ground under the middle of the body',
    Component: (p) => <Cow {...p} />,
  },
  {
    id: 'peacock',
    description:
      'Peacock facing left; train trailing on the ground, or fanned open behind it with eye-spots (params.fan: true) and shivering. The head bobs; head_turn/nod work.',
    params: { fan: 'boolean: tail fanned open' },
    bbox: [-300, -480, 650, 490],
    pivots: basePivots(60),
    origin: 'ground between the feet',
    Component: (p) => <Peacock {...p} />,
  },
  {
    id: 'owl',
    description:
      'Gond-patterned owl sitting upright, big gold eyes that blink now and then; head_turn swivels the head. Put it on a branch or wall top (origin = its feet).',
    params: { color: 'feather colour (#hex)' },
    bbox: [-120, -360, 240, 380],
    pivots: basePivots(60),
    origin: 'feet (the perch point)',
    Component: (p) => <Owl {...p} />,
  },
  {
    id: 'crow',
    description:
      'Black crow standing, facing left; hops and caws (beak opens) every couple of seconds. An omen in folklore.',
    params: {},
    bbox: [-140, -180, 300, 190],
    pivots: basePivots(40),
    origin: 'ground between the feet',
    Component: (p) => <Crow {...p} />,
  },
  {
    id: 'cobra',
    description:
      'Cobra coiled on the ground with its hood raised, swaying slowly, tongue flicking; spectacle mark on the hood.',
    params: { color: 'scale colour (#hex)' },
    bbox: [-160, -500, 320, 510],
    pivots: basePivots(120),
    origin: 'ground under the coil',
    Component: (p) => <Cobra {...p} />,
  },
  {
    id: 'birds_flock',
    description:
      'A loose V of small dark birds flapping and drifting left across the sky. Place high in the frame on the mid layer.',
    params: {
      count: 'number of birds (default 7)',
      color: 'bird colour (#hex)',
      speed: 'drift px/s (default 60)',
    },
    bbox: [-300, -200, 900, 400],
    origin: 'centre of the flock at t=0',
    Component: (p) => <Flock {...p} />,
  },
  {
    id: 'dog',
    description:
      'Indian street dog (pariah) in profile facing left: lean, tan, curled tail that wags, pricked ears. head_turn/nod move the head, walk_in_place steps the legs.',
    params: { color: 'coat colour (#hex)' },
    bbox: [-290, -300, 480, 310],
    pivots: basePivots(150),
    origin: 'ground under the middle of the body',
    Component: (p) => <Dog {...p} />,
  },
  {
    id: 'horse',
    description:
      'Horse in profile facing left, dark mane, patterned saddle cloth (params.saddle: false to remove), swishing tail. head_turn/nod move the head, walk_in_place steps the legs.',
    params: {
      color: 'coat colour (#hex)',
      mane: 'mane colour (#hex)',
      saddle: 'boolean (default true)',
      saddleColor: '#hex',
    },
    bbox: [-370, -640, 680, 650],
    pivots: basePivots(220),
    origin: 'ground under the middle of the body',
    Component: (p) => <Horse {...p} />,
  },
  {
    id: 'tree_round',
    description:
      'Folk round tree (peepal/mango): trunk and a scalloped canopy with a dotted Gond edge (diorama style).',
    params: { color: COLORS, height: 'px (default 600)' },
    bbox: [-260, -860, 520, 870],
    pivots: basePivots(30),
    origin: 'base of the trunk',
    Component: ({ params }) => (
      <RoundTree
        x={0}
        base={0}
        h={params.height ?? 600}
        r={(params.height ?? 600) * 0.4}
        fill={params.color ?? '#3f8a4a'}
        bark="#4a2f5e"
        pattern="dots-gold"
      />
    ),
  },
  {
    id: 'palm_tree',
    description: 'Coconut palm with a leaning trunk and fronds (diorama style).',
    params: { color: COLORS, height: 'px (default 520)', lean: 'px the crown leans right (negative = left)' },
    bbox: [-200, -700, 400, 710],
    pivots: basePivots(20),
    origin: 'base of the trunk',
    Component: ({ params }) => (
      <Palm
        x={0}
        base={0}
        h={params.height ?? 520}
        fill={params.color ?? '#2a8a7a'}
        bark="#4a2f5e"
        lean={params.lean ?? 30}
      />
    ),
  },
  {
    id: 'pine_tree',
    description: 'Layered mountain pine; params.snow lays snow on each tier (diorama style).',
    params: { color: COLORS, height: 'px (default 480)', snow: 'boolean' },
    bbox: [-210, -500, 420, 510],
    pivots: basePivots(20),
    origin: 'base of the trunk',
    Component: ({ params }) => (
      <FolkPine
        x={0}
        base={0}
        h={params.height ?? 480}
        fill={params.color ?? '#1f6f6a'}
        bark="#4a2f5e"
        snow={params.snow ? '#f8f6f0' : undefined}
      />
    ),
  },
  {
    id: 'diya',
    description:
      'Clay oil lamp (diya) with a flickering flame and glow; state.light (light_on/off actions) dims it.',
    params: {},
    bbox: [-50, -90, 100, 100],
    pivots: basePivots(26),
    origin: 'base centre',
    Component: ({ state }) => {
      const { t } = useShot();
      return (
        <Diya
          x={0}
          y={0}
          s={1.4}
          lit={state.light}
          flicker={0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3)}
        />
      );
    },
  },
];
