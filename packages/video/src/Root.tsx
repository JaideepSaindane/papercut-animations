import React from 'react';
import { Composition, staticFile, type CalculateMetadataFunction } from 'remotion';
import { FORMATS, StorySpec, specTotalFrames, type Format, type StorySpecInput } from '@papercut/schema';
import { Shot, Story } from '@papercut/kit';
import prototypeSpec from '../fixtures/prototype10s.spec.json';
import folkloreSpec from '../fixtures/folklore-proof.spec.json';
import { GALLERY_SECTIONS, KitGallery, gallerySheet, sheetSize, type GallerySection } from './KitGallery';
import { STORIES } from './generated/stories';

/** `format` overrides the spec's own format, so one spec renders vertical and horizontal. */
type StoryProps = { spec: StorySpecInput; format?: Format; assetBase?: string };
type ShotPreviewProps = { spec: StorySpecInput; shotId: string; format?: Format };
type GalleryProps = { section: GallerySection; format: Format };

const StoryComp: React.FC<StoryProps> = ({ spec, format, assetBase }) => (
  <Story spec={StorySpec.parse(spec)} format={format} assetBase={assetBase} />
);

const ShotPreviewComp: React.FC<ShotPreviewProps> = ({ spec, shotId, format }) => {
  const parsed = StorySpec.parse(spec);
  const shot = parsed.shots.find((s) => s.id === shotId) ?? parsed.shots[0];
  return <Shot shot={shot} characters={parsed.characters} startFrame={0} lang={parsed.language} format={format ?? parsed.format} style={parsed.style} />;
};

const storyMetadata: CalculateMetadataFunction<StoryProps> = ({ props }) => {
  const spec = StorySpec.parse(props.spec);
  const f = FORMATS[props.format ?? spec.format];
  return { durationInFrames: specTotalFrames(spec), fps: spec.fps, width: f.width, height: f.height };
};

const shotMetadata: CalculateMetadataFunction<ShotPreviewProps> = ({ props }) => {
  const spec = StorySpec.parse(props.spec);
  const shot = spec.shots.find((s) => s.id === props.shotId) ?? spec.shots[0];
  const f = FORMATS[props.format ?? spec.format];
  return { durationInFrames: shot.durationInFrames ?? 60, fps: spec.fps, width: f.width, height: f.height };
};

const galleryMetadata: CalculateMetadataFunction<GalleryProps> = ({ props }) => ({
  ...sheetSize(gallerySheet(props.section, props.format)),
  durationInFrames: 1,
  fps: 30,
});

const proto = prototypeSpec as StorySpecInput;
const common = { durationInFrames: 300, fps: 30, width: 1080, height: 1920 } as const;

export const RemotionRoot: React.FC = () => (
  <>
    {/* The five-shot Dahmer test, built entirely from kit pieces, in both formats. */}
    <Composition id="Prototype10s" component={StoryComp} defaultProps={{ spec: proto, format: 'vertical' as Format }} calculateMetadata={storyMetadata} {...common} />
    <Composition id="Prototype10sLandscape" component={StoryComp} defaultProps={{ spec: proto, format: 'horizontal' as Format }} calculateMetadata={storyMetadata} {...common} />
    {/* Style A proof: the diorama house style + folklore pack, fully code-drawn. */}
    <Composition id="FolkloreProof" component={StoryComp} defaultProps={{ spec: folkloreSpec as StorySpecInput, format: 'vertical' as Format }} calculateMetadata={storyMetadata} {...common} />
    <Composition id="FolkloreProofLandscape" component={StoryComp} defaultProps={{ spec: folkloreSpec as StorySpecInput, format: 'horizontal' as Format }} calculateMetadata={storyMetadata} {...common} />
    {/* Any timed StorySpec, passed via --props='{"spec": ..., "format": "horizontal"}'. */}
    <Composition id="Story" component={StoryComp} defaultProps={{ spec: proto }} calculateMetadata={storyMetadata} {...common} />
    <Composition id="ShotPreview" component={ShotPreviewComp} defaultProps={{ spec: proto, shotId: 'S02' }} calculateMetadata={shotMetadata} {...common} />
    {/* Every timed story in data/stories, with its voice (served from assets/stories), in both formats. */}
    {STORIES.flatMap(({ slug, lang, spec }) =>
      (['vertical', 'horizontal'] as Format[]).map((format) => (
        <Composition
          key={`${slug}-${lang}-${format}`}
          id={`${slug}-${lang}-${format}`.replace(/[^a-zA-Z0-9-]/g, '-')}
          component={StoryComp}
          defaultProps={{ spec, format, assetBase: staticFile(`stories/${slug}`) }}
          calculateMetadata={storyMetadata}
          {...common}
        />
      )),
    )}
    {GALLERY_SECTIONS.map((section) => (
      <Composition
        key={section}
        id={`KitGallery-${section}`}
        component={KitGallery}
        defaultProps={{ section, format: 'vertical' as Format }}
        calculateMetadata={galleryMetadata}
        {...common}
        durationInFrames={1}
      />
    ))}
  </>
);
