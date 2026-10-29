// Hair styles in rig space (face ellipse centred at 540,990; top of head ≈ 840). Each style has an
// optional back piece (behind the face) and front piece (over the forehead).
import React from 'react';
import { INK } from '../palettes';
import { C, P, R } from '../core/Ink';
import { shade } from '../core/math';

type HairPieces = { back?: (c: string) => React.ReactNode; front?: (c: string) => React.ReactNode };

const sweptFringe =
  'M 416 975 C 405 850 470 826 540 826 C 612 826 676 850 664 975 C 640 905 600 892 560 892 C 600 920 610 960 612 990 C 590 935 500 900 416 975 Z';
const cap =
  'M 418 960 C 405 860 470 828 540 828 C 612 828 676 860 662 960 C 650 905 610 880 540 880 C 470 880 430 905 418 960 Z';

export const HAIR: Record<string, HairPieces> = {
  side_part: {
    front: (c) => (
      <>
        <P
          d="M408 975 C 395 845 468 800 545 800 C 645 800 698 855 674 965 C 655 905 605 882 560 886 C 515 872 465 905 428 975 Z"
          fill={c}
        />
        <P d="M562 886 C 520 900 470 935 448 968 C 478 912 525 880 610 872 Z" fill={shade(c, -0.08)} />
      </>
    ),
  },
  crew: { front: (c) => <P d={cap} fill={c} /> },
  long_straight: {
    back: (c) => (
      <P
        d="M 404 970 C 392 830 688 830 676 970 L 690 1170 L 618 1160 L 604 1000 L 476 1000 L 462 1160 L 390 1170 Z"
        fill={c}
      />
    ),
    front: (c) => <P d={sweptFringe} fill={c} />,
  },
  long_wavy: {
    back: (c) => (
      <P
        d="M 404 970 C 380 830 700 830 676 970 C 700 1030 670 1060 694 1120 C 704 1150 680 1180 640 1170 C 650 1120 610 1080 604 1000 L 476 1000 C 470 1080 430 1120 440 1170 C 400 1180 376 1150 386 1120 C 410 1060 380 1030 404 970 Z"
        fill={c}
      />
    ),
    front: (c) => <P d={sweptFringe} fill={c} />,
  },
  bald: {
    front: () => (
      <ellipse cx={498} cy={878} rx={34} ry={12} fill="#fff" opacity={0.22} transform="rotate(-18 498 878)" />
    ),
  },
  receding: {
    front: (c) => (
      <>
        <ellipse
          cx={500}
          cy={872}
          rx={30}
          ry={10}
          fill="#fff"
          opacity={0.2}
          transform="rotate(-18 500 872)"
        />
        <P d="M 416 990 C 408 930 420 896 448 874 C 440 920 440 960 448 1000 Z" fill={c} />
        <P d="M 664 990 C 672 930 660 896 632 874 C 640 920 640 960 632 1000 Z" fill={c} />
      </>
    ),
  },
  bob: {
    back: (c) => (
      <P
        d="M 400 980 C 380 820 700 820 680 980 L 688 1090 L 610 1090 L 600 990 L 480 990 L 470 1090 L 392 1090 Z"
        fill={c}
      />
    ),
    front: (c) => (
      <P
        d="M 420 960 C 404 790 676 790 660 960 L 640 940 L 620 955 L 600 935 L 580 952 L 560 932 L 540 950 L 520 932 L 500 952 L 480 935 L 460 955 L 440 940 Z"
        fill={c}
      />
    ),
  },
  bun: {
    back: (c) => (
      <>
        <circle cx={540} cy={812} r={56} fill={c} stroke={INK} strokeWidth={3} />
        <path d="M 510 800 Q 540 780 570 805" fill="none" stroke={shade(c, -0.25)} strokeWidth={2} />
      </>
    ),
    front: (c) => (
      <P
        d="M 418 970 C 405 860 470 832 540 832 C 612 832 676 860 662 970 C 640 900 600 880 540 880 C 480 880 440 900 418 970 Z"
        fill={c}
      />
    ),
  },
  afro: {
    back: (c) => (
      <P
        d="M 540 750 C 710 750 750 900 728 1010 C 708 1086 664 1066 652 1010 L 428 1010 C 416 1066 372 1086 352 1010 C 330 900 370 750 540 750 Z"
        fill={c}
      />
    ),
    front: (c) => <P d="M 418 966 C 404 790 676 790 662 966 C 628 916 452 916 418 966 Z" fill={c} />,
  },
  ponytail: {
    back: (c) => <P d="M 640 880 C 730 900 744 1050 708 1140 C 690 1080 672 1000 632 950 Z" fill={c} />,
    front: (c) => <P d={cap} fill={c} />,
  },
  braid: {
    back: (c) => (
      <>
        <P
          d="M 640 930 C 700 980 704 1080 680 1180 C 676 1200 654 1196 656 1176 C 672 1080 664 1000 620 950 Z"
          fill={c}
        />
        {[1010, 1060, 1110, 1160].map((y) => (
          <path
            key={y}
            d={`M ${662 - (y - 1010) * 0.04} ${y} q 12 10 24 0`}
            fill="none"
            stroke={shade(c, 0.25)}
            strokeWidth={3}
          />
        ))}
        <circle cx={668} cy={1196} r={10} fill="#d4532b" />
      </>
    ),
    front: (c) => (
      <P
        d="M 418 968 C 404 800 676 800 662 968 C 640 900 600 884 540 884 C 480 884 440 900 418 968 Z"
        fill={c}
      />
    ),
  },
  mullet: {
    back: (c) => (
      <P
        d="M 410 980 C 400 900 680 900 670 980 L 682 1140 L 620 1122 L 610 1000 L 470 1000 L 460 1122 L 398 1140 Z"
        fill={c}
      />
    ),
    front: (c) => <P d={cap} fill={c} />,
  },
};

// Headwear (the hair colour is the cloth colour). Each hides the hair beneath it.
HAIR.turban = {
  back: (c) => (
    <P
      d="M 640 900 C 692 960 702 1060 684 1130 L 652 1122 C 664 1050 654 984 620 944 Z"
      fill={shade(c, -0.12)}
    />
  ),
  front: (c) => (
    <>
      <P
        d="M 408 962 C 392 858 440 772 540 762 C 640 772 688 858 672 962 C 642 920 600 904 540 904 C 480 904 438 920 408 962 Z"
        fill={c}
      />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M ${420 + i * 8} ${930 - i * 38} Q 540 ${860 - i * 46} ${664 - i * 8} ${930 - i * 38}`}
          fill="none"
          stroke={shade(c, -0.22)}
          strokeWidth={4}
        />
      ))}
      <circle cx={540} cy={872} r={16} fill="#f0c35a" stroke={INK} strokeWidth={2} />
      <path d="M 540 858 Q 560 800 590 782 Q 566 820 552 860 Z" fill="#f6ead0" />
    </>
  ),
};
HAIR.veil = {
  back: (c) => (
    <P d="M 398 1000 C 378 836 460 786 540 786 C 620 786 702 836 682 1000 L 724 1250 L 356 1250 Z" fill={c} />
  ),
  front: (c) => (
    <>
      <P
        d="M 412 962 C 398 836 470 796 540 796 C 610 796 682 836 668 962 C 640 900 600 880 540 880 C 480 880 440 900 412 962 Z"
        fill={c}
      />
      <path
        d="M 412 962 C 398 836 470 796 540 796 C 610 796 682 836 668 962"
        fill="none"
        stroke="#f0c35a"
        strokeWidth={10}
      />
    </>
  ),
};
HAIR.police_cap = {
  back: () => (
    <P d="M 420 960 C 412 1000 430 1040 450 1060 L 630 1060 C 650 1040 668 1000 660 960 Z" fill="#1f1a18" />
  ),
  front: (c) => (
    <>
      <P d="M 412 906 C 404 836 470 796 540 796 C 610 796 676 836 668 906 Z" fill={c} />
      <R x={414} y={890} w={252} h={36} fill={shade(c, -0.35)} />
      <P d="M 428 924 Q 540 964 652 924 L 642 948 Q 540 986 438 948 Z" fill="#2a2420" />
      <C cx={540} cy={858} r={20} fill="#c9a23a" />
    </>
  ),
};

export const HAIR_STYLES = Object.keys(HAIR);
