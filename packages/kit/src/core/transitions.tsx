// Cross-shot transitions (spec 7.5): `fade` and `paper_slide` overlap the shots by 8 frames.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { easeOutCubic } from './math';

type SlideProps = Record<string, never>;

/** The next shot slides in from the right like a sheet of paper, casting a shadow on the outgoing one. */
const PaperSlide: React.FC<TransitionPresentationComponentProps<SlideProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
}) => {
  const e = easeOutCubic(presentationProgress);
  if (presentationDirection === 'exiting') {
    return (
      <AbsoluteFill>
        {children}
        <AbsoluteFill style={{ backgroundColor: '#120806', opacity: 0.35 * e }} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${(1 - e) * 100}%) rotate(${(1 - e) * 1.5}deg)`,
        boxShadow: '-24px 0 40px rgba(18,8,6,0.6), -6px 0 0 #f3ead8',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const paperSlide = (): TransitionPresentation<SlideProps> => ({ component: PaperSlide, props: {} });

export const presentationFor = (t: 'fade' | 'paper_slide'): TransitionPresentation<any> =>
  t === 'fade' ? (fade() as TransitionPresentation<any>) : paperSlide();
